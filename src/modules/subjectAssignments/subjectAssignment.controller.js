const SubjectAssignment = require('./subjectAssignment.model');
const SubjectAllocation = require('../subjectAllocations/subjectAllocation.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const paginate = require('@/utils/paginate');
const {
  validateAndNormalizeCategoriesOverride,
  getEffectiveCategoryCount,
  checkMonthOverlap,
  isShareExpired,
  formatAssignment,
  populateAssignment,
  getFormattedAssignmentById,
} = require('./subjectAssignment.helper');
const { getActiveTeacherById, getTeacherIdFromUser } = require('../teachers/teacher.helper');

// POST /api/v1/subject-assignments - Admin + Main Teacher (of that Allocation)
exports.createSubjectAssignment = async (req, res, next) => {
  const { allocationId, semester, calendarMonth, academicYear, categoriesOverride, removedCategoryIds } = req.body;

  const allocation = await SubjectAllocation.findOne({ _id: allocationId, isActive: true })
    .populate('subjectId', 'name defaultCategories')
    .populate({
      path: 'subjectId.defaultCategories.categoryId',
      select: 'name',
      match: { isActive: true }, // ✅ ADDED
    })
    .lean();
  if (!allocation) return next(new ApiError('Allocation not found', 404));

  // Semester must be allowed by Allocation - e.g. Allocation [1] cannot create Sem 2 Assignment
  if (!Array.isArray(allocation.semesters) || !allocation.semesters.includes(semester)) {
    return next(new ApiError(`This Allocation is only for Semester(s): ${(allocation.semesters || []).join(', ')}`, 400));
  }

  // Teacher can only create for his own Allocation - Admin can create for any
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    if (String(allocation.mainTeacherId) !== String(teacherId)) {
      return next(new ApiError('Only main teacher of this Allocation can create Monthly Assignment', 403));
    }
  }

  const subjectDefaults = (allocation.subjectId?.defaultCategories || []).filter((c) => c.categoryId);
  const { normalized, removed } = await validateAndNormalizeCategoriesOverride(categoriesOverride, removedCategoryIds, subjectDefaults);
  if (getEffectiveCategoryCount(subjectDefaults, normalized ?? [], removed ?? []) === 0) {
    return next(new ApiError('At least one category is required', 400));
  }

  await checkMonthOverlap(allocationId, semester, calendarMonth, academicYear);

  try {
    const created = await SubjectAssignment.create({
      allocationId,
      semester,
      calendarMonth,
      academicYear,
      // SNAPSHOT - Copy from Allocation at creation time
      // Allocation me Teacher baad me badal bhi gaya, to ye Assignment purane Teacher ka hi rahega
      mainTeacherId: allocation.mainTeacherId, // SNAPSHOT
      categoriesOverride: normalized ?? [],
      removedCategoryIds: removed ?? [],
    });
    const assignment = await getFormattedAssignmentById(created._id);
    return ApiResponse.send(res, 201, { assignment }, 'Monthly assignment created successfully');
  } catch (err) {
    // Race condition - Unique index caught duplicate
    if (err.code === 11000) {
      return next(new ApiError('An Assignment already exists for this Semester, Calendar Month and Year in this Allocation', 409));
    }
    throw err;
  }
};

// GET /api/v1/subject-assignments - Admin: all, Teacher: only mine + shared
exports.getSubjectAssignments = async (req, res, next) => {
  let filter = { isActive: true };
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    filter = {
      ...filter,
      $or: [{ mainTeacherId: teacherId }, { sharedToTeacherId: teacherId, $or: [{ sharedUntil: null }, { sharedUntil: { $gt: new Date() } }] }],
    };
  }
  // req.query is already validated + coerced by getSubjectAssignmentsQuerySchema - no NaN risk
  if (req.query.allocationId) filter.allocationId = req.query.allocationId;
  if (req.query.semester) filter.semester = Number(req.query.semester);
  if (req.query.calendarMonth) filter.calendarMonth = Number(req.query.calendarMonth);
  if (req.query.academicYear) filter.academicYear = Number(req.query.academicYear);
  if (req.query.status) filter.status = req.query.status;

  const { page, limit } = req.query;
  const result = await paginate(SubjectAssignment, filter, {
    page,
    limit,
    sort: { academicYear: 1, semester: 1, calendarMonth: 1, createdAt: -1 },
    populate: populateAssignment,
  });

  return ApiResponse.send(
    res,
    200,
    {
      assignments: result.data.map(formatAssignment),
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    },
    'Assignments fetched successfully',
  );
};

// GET /api/v1/subject-assignments/:id
exports.getSubjectAssignmentById = async (req, res, next) => {
  const assignmentRaw = await populateAssignment(SubjectAssignment.findOne({ _id: req.params.id, isActive: true })).lean();
  if (!assignmentRaw) return next(new ApiError('Assignment not found', 404));
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    const isMine = String(assignmentRaw.mainTeacherId?._id || assignmentRaw.mainTeacherId) === String(teacherId);
    const isShared = String(assignmentRaw.sharedToTeacherId?._id || assignmentRaw.sharedToTeacherId) === String(teacherId);
    if (!isMine && !isShared) return next(new ApiError('Not authorized to view this assignment', 403));
    if (!isMine && isShared && isShareExpired(assignmentRaw)) return next(new ApiError('Share expired', 403));
  }
  return ApiResponse.send(res, 200, { assignment: formatAssignment(assignmentRaw) }, 'Assignment fetched successfully');
};

// PATCH /api/v1/subject-assignments/:id - Admin + Main Teacher (Snapshot) - Categories + Status only
exports.updateSubjectAssignment = async (req, res, next) => {
  const { categoriesOverride, removedCategoryIds, status } = req.body;
  const assignment = await SubjectAssignment.findOne({ _id: req.params.id, isActive: true });
  if (!assignment) return next(new ApiError('Assignment not found', 404));
  // LOCK - Completed Assignment cannot be edited
  if (assignment.status === 'completed') return next(new ApiError('Completed assignment cannot be edited', 400));

  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    if (String(assignment.mainTeacherId) !== String(teacherId)) {
      return next(new ApiError('Only main teacher can edit this assignment', 403));
    }
  }

  if (categoriesOverride !== undefined || removedCategoryIds !== undefined) {
    // TODO - Block if Marks exist - Add when Marks module is ready
    // Convert Mongoose sub-documents to plain objects before validation
    const effectiveOverride =
      categoriesOverride !== undefined
        ? categoriesOverride
        : assignment.categoriesOverride.map((c) => ({ categoryId: c.categoryId, maxMarks: c.maxMarks, order: c.order }));
    const effectiveRemoved = removedCategoryIds !== undefined ? removedCategoryIds : assignment.removedCategoryIds.map((id) => String(id?._id || id));
    const allocation = await SubjectAllocation.findById(assignment.allocationId)
      .populate('subjectId', 'defaultCategories')
      .populate({
        path: 'subjectId.defaultCategories.categoryId',
        select: 'name',
        match: { isActive: true }, // ✅ ADDED
      })
      .lean();
    const subjectDefaults = (allocation?.subjectId?.defaultCategories || []).filter((c) => c.categoryId);
    const { normalized, removed } = await validateAndNormalizeCategoriesOverride(effectiveOverride, effectiveRemoved, subjectDefaults);
    if (getEffectiveCategoryCount(subjectDefaults, normalized ?? [], removed ?? []) === 0) {
      return next(new ApiError('At least one category is required', 400));
    }
    assignment.categoriesOverride = normalized ?? [];
    assignment.removedCategoryIds = removed ?? [];
  }
  if (status !== undefined) assignment.status = status;

  await assignment.save();
  const updated = await getFormattedAssignmentById(assignment._id);
  return ApiResponse.send(res, 200, { assignment: updated }, 'Assignment updated successfully');
};

// DELETE - Soft Delete - Admin Only
exports.deleteSubjectAssignment = async (req, res, next) => {
  const deleted = await SubjectAssignment.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    { $set: { isActive: false, sharedToTeacherId: null, sharedUntil: null, sharedBy: null } },
    { new: true },
  );
  if (!deleted) return next(new ApiError('Assignment not found', 404));
  // TODO - Block if Marks exist - Add when Marks module is ready
  return ApiResponse.send(res, 200, null, 'Assignment deleted successfully');
};

// POST /:id/share
exports.shareSubjectAssignment = async (req, res, next) => {
  const { sharedToTeacherId, sharedUntil } = req.body;
  const assignment = await SubjectAssignment.findOne({ _id: req.params.id, isActive: true });
  if (!assignment) return next(new ApiError('Assignment not found', 404));
  if (assignment.status === 'completed') return next(new ApiError('Completed assignment cannot be shared', 400));
  if (String(sharedToTeacherId) === String(assignment.mainTeacherId)) {
    return next(new ApiError('Cannot share with main teacher itself', 400));
  }
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    if (String(assignment.mainTeacherId) !== String(teacherId)) return next(new ApiError('Only main teacher can share this assignment', 403));
    if (String(sharedToTeacherId) === String(teacherId)) return next(new ApiError('Cannot share with yourself', 400));
  }
  const shareTo = await getActiveTeacherById(sharedToTeacherId);
  if (!shareTo) return next(new ApiError('Teacher to share with not found', 404));
  assignment.sharedToTeacherId = shareTo._id;
  assignment.sharedUntil = sharedUntil ?? null;
  assignment.sharedBy = req.user.id;
  await assignment.save();
  const updated = await getFormattedAssignmentById(assignment._id);
  return ApiResponse.send(res, 200, { assignment: updated }, 'Assignment shared successfully');
};

// POST /:id/unshare
exports.unshareSubjectAssignment = async (req, res, next) => {
  const assignment = await SubjectAssignment.findOne({ _id: req.params.id, isActive: true });
  if (!assignment) return next(new ApiError('Assignment not found', 404));
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    const isMain = String(assignment.mainTeacherId) === String(teacherId);
    const isSharer = String(assignment.sharedBy) === String(req.user.id);
    if (!isMain && !isSharer) return next(new ApiError('Not authorized to unshare', 403));
  }
  assignment.sharedToTeacherId = null;
  assignment.sharedUntil = null;
  assignment.sharedBy = null;
  await assignment.save();
  return ApiResponse.send(res, 200, null, 'Assignment unshared successfully');
};
