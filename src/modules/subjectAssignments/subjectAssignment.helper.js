const SubjectAssignment = require('./subjectAssignment.model');
const Category = require('../categories/category.model');
const ApiError = require('@/utils/apiError');
const { formatTeacher } = require('../teachers/teacher.helper');

// Calendar Month -> Label - monthLabel is NOT stored in DB, derived from calendarMonth
const MONTH_LABELS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const getMonthLabel = (calendarMonth) => MONTH_LABELS[calendarMonth] || null;

// Validate + normalize `categoriesOverride` / `removedCategoryIds` against Subject defaults.
// Returns `{ normalized, removed }` - both `undefined` if nothing was sent.
const validateAndNormalizeCategoriesOverride = async (categoriesOverride, removedCategoryIds, subjectDefaults = []) => {
  if (categoriesOverride === undefined && removedCategoryIds === undefined) {
    return { normalized: undefined, removed: undefined };
  }

  const override = categoriesOverride || [];
  const removed = removedCategoryIds || [];

  const ids = override.map((c) => String(c.categoryId));
  if (new Set(ids).size !== ids.length) {
    throw new ApiError('Duplicate category in categoriesOverride', 400);
  }

  const removedIds = removed.map((id) => String(id?._id || id));
  if (new Set(removedIds).size !== removedIds.length) {
    throw new ApiError('Duplicate category in removedCategoryIds', 400);
  }

  // A category cannot be in both lists.
  const overlap = ids.filter((id) => removedIds.includes(id));
  if (overlap.length) {
    throw new ApiError('Category cannot be in both categoriesOverride and removedCategoryIds', 400);
  }

  const orders = override.filter((c) => c.order !== undefined).map((c) => c.order);
  if (new Set(orders).size !== orders.length) {
    throw new ApiError('Duplicate order in categoriesOverride', 400);
  }

  const allIds = [...ids, ...removedIds];
  const categories = await Category.find({ _id: { $in: allIds }, isActive: true }).lean();
  if (categories.length !== allIds.length) {
    throw new ApiError('One or more categories not found', 404);
  }

  // Map of default categories - categoryId -> order.
  const defaultOrderMap = new Map();
  (subjectDefaults || []).forEach((d) => {
    if (!d.categoryId) return;
    defaultOrderMap.set(String(d.categoryId?._id || d.categoryId), d.order);
  });

  // Only default categories can be removed - a non-default category has nothing to remove.
  removedIds.forEach((id) => {
    if (!defaultOrderMap.has(id)) {
      throw new ApiError('Only default categories can be removed', 400);
    }
  });

  // Active defaults = defaults minus removed - base for final merged orders.
  const activeDefaultOrderMap = new Map();
  defaultOrderMap.forEach((order, id) => {
    if (!removedIds.includes(id)) activeDefaultOrderMap.set(id, order);
  });

  const finalOrderMap = new Map(activeDefaultOrderMap);
  override.forEach((c) => {
    if (c.order !== undefined) {
      finalOrderMap.set(String(c.categoryId), c.order);
    }
  });
  const finalOrders = [...finalOrderMap.values()];
  if (new Set(finalOrders).size !== finalOrders.length) {
    throw new ApiError('Duplicate order in categoriesOverride - Order already used by a default category', 400);
  }

  const usedOrders = new Set();
  activeDefaultOrderMap.forEach((order, id) => {
    if (!ids.includes(id)) usedOrders.add(order);
  });
  override.forEach((c) => {
    if (c.order === undefined) {
      const kept = defaultOrderMap.get(String(c.categoryId));
      if (kept !== undefined) usedOrders.add(kept);
    }
  });
  orders.forEach((o) => usedOrders.add(o));

  let nextOrder = 1;
  const normalized = override.map((c) => {
    if (c.order !== undefined) {
      return { categoryId: c.categoryId, maxMarks: c.maxMarks, order: c.order };
    }
    const id = String(c.categoryId);
    if (defaultOrderMap.has(id)) {
      return { categoryId: c.categoryId, maxMarks: c.maxMarks, order: defaultOrderMap.get(id) };
    }
    while (usedOrders.has(nextOrder)) nextOrder++;
    const assigned = nextOrder;
    usedOrders.add(assigned);
    nextOrder++;
    return { categoryId: c.categoryId, maxMarks: c.maxMarks, order: assigned };
  });

  return { normalized, removed: removedIds };
};

// Effective category count = (defaults - removed) + new overrides not in defaults.
const getEffectiveCategoryCount = (subjectDefaults, normalized, removed) => {
  const defaultIds = (subjectDefaults || []).filter((d) => d.categoryId).map((d) => String(d.categoryId?._id || d.categoryId));
  const removedSet = new Set((removed || []).map(String));
  const activeDefaultsCount = defaultIds.filter((id) => !removedSet.has(id)).length;
  const newOverrideCount = (normalized || []).filter((c) => !defaultIds.includes(String(c.categoryId))).length;
  return activeDefaultsCount + newOverrideCount;
};

// Overlap check - One Assignment per Allocation + Semester + Calendar Month + Year
const checkMonthOverlap = async (allocationId, semester, calendarMonth, academicYear, excludeId = null) => {
  const query = { allocationId, semester, calendarMonth, academicYear, isActive: true };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await SubjectAssignment.findOne(query).lean();
  if (existing) throw new ApiError('An Assignment already exists for this Semester, Calendar Month and Year in this Allocation', 409);
};

const isShareExpired = (assignment) => {
  if (!assignment.sharedToTeacherId) return false;
  if (!assignment.sharedUntil) return false;
  return new Date(assignment.sharedUntil) < new Date();
};

const formatAssignment = (assignment) => {
  if (!assignment) return null;
  const rawSubject = assignment.allocationId?.subjectId;
  const { allocationId, mainTeacherId, sharedToTeacherId, sharedBy, __v, ...rest } = assignment;

  // Only active defaults are used for effective categories
  const cleanedDefaults = (rawSubject?.defaultCategories || []).filter((c) => c.categoryId);

  // Slim subject - only id and name, defaultCategories are not sent to frontend
  // Frontend should use effectiveCategories for display and editing
  const subject = rawSubject ? { _id: rawSubject._id, name: rawSubject.name } : null;

  const removedIds = new Set((assignment.removedCategoryIds || []).map((r) => String(r?._id || r)));

  const map = new Map();
  cleanedDefaults.forEach((c) => {
    const id = String(c.categoryId?._id || c.categoryId);
    if (removedIds.has(id)) return;
    map.set(id, { categoryId: c.categoryId?._id || c.categoryId, name: c.categoryId?.name || null, maxMarks: c.maxMarks, order: c.order });
  });
  if (assignment.categoriesOverride && assignment.categoriesOverride.length > 0) {
    assignment.categoriesOverride.forEach((c) => {
      if (!c.categoryId) return;
      const id = String(c.categoryId?._id || c.categoryId);
      const existing = map.get(id);
      map.set(id, { categoryId: c.categoryId?._id || c.categoryId, name: c.categoryId?.name || existing?.name || null, maxMarks: c.maxMarks, order: c.order });
    });
  }
  const effectiveCategories = [...map.values()].filter((c) => c.categoryId && c.name).sort((a, b) => a.order - b.order);

  return {
    ...rest,
    monthLabel: getMonthLabel(assignment.calendarMonth),
    allocation: allocationId
      ? { _id: allocationId._id, subject, class: allocationId.classId, sections: allocationId.sectionIds, semesters: allocationId.semesters }
      : null,
    subject,
    mainTeacher: formatTeacher(mainTeacherId),
    sharedToTeacher: formatTeacher(sharedToTeacherId),
    sharedBy,
    effectiveCategories,
  };
};

const populateAssignment = (query) =>
  query
    .populate({
      path: 'allocationId',
      select: 'subjectId classId sectionIds semesters mainTeacherId',
      populate: [
        {
          path: 'subjectId',
          select: 'name defaultCategories',
          populate: {
            path: 'defaultCategories.categoryId',
            select: 'name',
            match: { isActive: true },
          },
        },
        { path: 'classId', select: 'name' },
        { path: 'sectionIds', select: 'name' },
      ],
    })
    .populate({
      path: 'categoriesOverride.categoryId',
      select: 'name',
      match: { isActive: true },
    })
    .populate({
      path: 'removedCategoryIds',
      select: 'name',
      match: { isActive: true },
    })
    .populate({ path: 'mainTeacherId', populate: { path: 'userId', select: 'name email phone role avatar isActive' } })
    .populate({ path: 'sharedToTeacherId', populate: { path: 'userId', select: 'name email phone role avatar isActive' } })
    .populate('sharedBy', 'name email phone role');

const getFormattedAssignmentById = async (id) => {
  const assignment = await populateAssignment(SubjectAssignment.findOne({ _id: id, isActive: true })).lean();
  return formatAssignment(assignment);
};

module.exports = {
  MONTH_LABELS,
  getMonthLabel,
  validateAndNormalizeCategoriesOverride,
  getEffectiveCategoryCount,
  checkMonthOverlap,
  isShareExpired,
  formatAssignment,
  populateAssignment,
  getFormattedAssignmentById,
};
