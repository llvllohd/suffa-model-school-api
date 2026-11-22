const MarkSheet = require('./markSheet.model');
const SubjectAssignment = require('../subjectAssignments/subjectAssignment.model');
const ApiError = require('@/utils/apiError');
const { formatTeacher } = require('../teachers/teacher.helper');

// Build effective categories map - categoryId -> { name, maxMarks, order }
// Uses subject defaults - removed + categoriesOverride
const getAssignmentEffectiveMap = async (assignmentId, { allowCompleted = false, session = null } = {}) => {
  const assignment = await SubjectAssignment.findOne({ _id: assignmentId, isActive: true })
    .session(session)
    .populate('allocationId', 'subjectId classId sectionIds semesters')
    .populate({
      path: 'allocationId.subjectId',
      select: 'defaultCategories',
      populate: { path: 'defaultCategories.categoryId', select: 'name', match: { isActive: true } },
    })
    .populate({ path: 'categoriesOverride.categoryId', select: 'name', match: { isActive: true } })
    .lean();

  if (!assignment) throw new ApiError('Assignment not found', 404);
  if (!allowCompleted && assignment.status === 'completed') throw new ApiError('Completed assignment marks cannot be edited', 400);

  const subjectDefaults = (assignment.allocationId?.subjectId?.defaultCategories || []).filter((c) => c.categoryId);
  const removedIds = new Set((assignment.removedCategoryIds || []).map((id) => String(id?._id || id)));

  const map = new Map();
  subjectDefaults.forEach((c) => {
    const id = String(c.categoryId?._id || c.categoryId);
    if (removedIds.has(id)) return;
    map.set(id, { categoryId: c.categoryId?._id || c.categoryId, name: c.categoryId?.name, maxMarks: c.maxMarks, order: c.order });
  });
  (assignment.categoriesOverride || []).forEach((c) => {
    if (!c.categoryId) return;
    const id = String(c.categoryId?._id || c.categoryId);
    map.set(id, { categoryId: c.categoryId?._id || c.categoryId, name: c.categoryId?.name, maxMarks: c.maxMarks, order: c.order });
  });

  return { assignment, effectiveMap: map };
};

// Validate marks array - all effective categories must have marks, no extra category
const validateMarks = (marks, effectiveMap) => {
  const seen = new Set();
  marks.forEach((m) => {
    const id = String(m.categoryId);
    if (seen.has(id)) throw new ApiError('Duplicate category in marks', 400);
    seen.add(id);
    const effective = effectiveMap.get(id);
    if (!effective) throw new ApiError('Category is not part of this assignment', 400);
    if (m.obtainedMarks > effective.maxMarks) {
      throw new ApiError(`Obtained marks cannot exceed max marks (${effective.maxMarks}) for ${effective.name}`, 400);
    }
  });
  if (seen.size !== effectiveMap.size) {
    throw new ApiError('Marks for all categories are required', 400);
  }
  // Snapshot maxMarks from assignment, never trust client sent maxMarks
  return marks.map((m) => ({
    categoryId: m.categoryId,
    obtainedMarks: m.obtainedMarks,
    maxMarks: effectiveMap.get(String(m.categoryId)).maxMarks,
  }));
};

// Month key - "2026-11" from calendarMonth + academicYear
const getMonthKey = (assignment) => {
  const month = String(assignment.calendarMonth).padStart(2, '0');
  return `${assignment.academicYear}-${month}`;
};

const formatMarkSheet = (doc) => {
  if (!doc) return null;
  const { assignmentId, studentId, enteredByTeacherId, __v, ...rest } = doc;
  return {
    ...rest,
    assignment: assignmentId
      ? {
          _id: assignmentId._id,
          semester: assignmentId.semester,
          calendarMonth: assignmentId.calendarMonth,
          academicYear: assignmentId.academicYear,
          status: assignmentId.status,
        }
      : null,
    student: studentId,
    enteredByTeacher: formatTeacher(enteredByTeacherId),
    marks: (doc.marks || []).map((m) => ({
      categoryId: m.categoryId?._id || m.categoryId,
      name: m.categoryId?.name || null,
      obtainedMarks: m.obtainedMarks,
      maxMarks: m.maxMarks,
    })),
  };
};

const populateMarkSheet = (query) =>
  query
    .populate('assignmentId', 'semester calendarMonth academicYear status')
    .populate({
      path: 'studentId',
      select: 'rollNo classId sectionId userId',
      populate: { path: 'userId', select: 'name phone email' },
    })
    .populate({ path: 'marks.categoryId', select: 'name' })
    .populate({ path: 'enteredByTeacherId', populate: { path: 'userId', select: 'name email phone role avatar isActive' } });

const getFormattedMarkSheetById = async (id) => {
  const doc = await populateMarkSheet(MarkSheet.findById(id)).lean();
  return formatMarkSheet(doc);
};

module.exports = { getAssignmentEffectiveMap, validateMarks, getMonthKey, formatMarkSheet, populateMarkSheet, getFormattedMarkSheetById };
