const mongoose = require('mongoose');
const MarkSheet = require('./markSheet.model');
const Student = require('../students/student.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const paginate = require('@/utils/paginate');
const { getAssignmentEffectiveMap, validateMarks, getMonthKey, formatMarkSheet, populateMarkSheet } = require('./markSheet.helper');
const { getTeacherIdFromUser } = require('../teachers/teacher.helper');

// Teacher access - main teacher (snapshot) or shared teacher with valid share
// Admin cannot fill marks - Section 3 Permission Table
const checkTeacherAccess = async (assignment, req) => {
  const teacherId = await getTeacherIdFromUser(req.user.id);
  const isMain = String(assignment.mainTeacherId) === String(teacherId);
  const isShared = String(assignment.sharedToTeacherId) === String(teacherId);
  if (!isMain && !isShared) throw new ApiError('Not authorized to enter marks for this assignment', 403);
  if (!isMain && isShared && assignment.sharedUntil && new Date(assignment.sharedUntil) < new Date()) {
    throw new ApiError('Share expired', 403);
  }
  return teacherId;
};

// POST /api/v1/mark-sheets/bulk - Teacher fills full class in one call
// Role: teacher only - Admin cannot fill marks
// Transaction - All or nothing: 1 student fail = kisi ka bhi save nahi hoga
exports.bulkUpsertMarkSheets = async (req, res, next) => {
  const { assignmentId, sheets } = req.body;

  const session = await mongoose.startSession();
  try {
    let resultIds = [];

    await session.withTransaction(async () => {
      const { assignment, effectiveMap } = await getAssignmentEffectiveMap(assignmentId, { session });
      const teacherId = await checkTeacherAccess(assignment, req);

      const monthKey = getMonthKey(assignment);
      const results = [];

      // FIX: Duplicate student in same bulk call - reject before any save
      const seenStudents = new Set();
      for (const sheet of sheets) {
        const key = String(sheet.studentId);
        if (seenStudents.has(key)) throw new ApiError(`Duplicate student in sheets: ${sheet.studentId}`, 400);
        seenStudents.add(key);
      }

      const allocationSectionIds = (assignment.allocationId?.sectionIds || []).map((id) => String(id));

      for (const sheet of sheets) {
        const student = await Student.findOne({ _id: sheet.studentId }).session(session).populate('userId', 'isActive').lean();
        if (!student) throw new ApiError(`Student not found: ${sheet.studentId}`, 404);
        if (!student.userId?.isActive) throw new ApiError('Student is not active', 400);
        // Student must belong to same class as allocation
        if (String(student.classId) !== String(assignment.allocationId.classId)) {
          throw new ApiError('Student does not belong to this allocation class', 400);
        }
        // FIX: Student must belong to one of allocation sections
        if (!allocationSectionIds.includes(String(student.sectionId))) {
          throw new ApiError('Student does not belong to this allocation section', 400);
        }

        const normalized = validateMarks(sheet.marks, effectiveMap);
        const existing = await MarkSheet.findOne({ assignmentId, studentId: sheet.studentId, monthKey, semester: assignment.semester }).session(session);

        if (existing) {
          existing.marks = normalized;
          existing.enteredByTeacherId = teacherId;
          existing.enteredAt = new Date();
          await existing.save({ session });
          results.push(existing._id);
        } else {
          const created = await MarkSheet.create(
            [
              {
                assignmentId,
                studentId: sheet.studentId,
                classId: student.classId,
                sectionId: student.sectionId,
                semester: assignment.semester,
                monthKey,
                enteredByTeacherId: teacherId,
                marks: normalized,
              },
            ],
            { session },
          );
          results.push(created[0]._id);
        }
      }
      resultIds = results;
    });

    // Populate AFTER commit - transaction ke andar populate mat karo
    const docs = await populateMarkSheet(MarkSheet.find({ _id: { $in: resultIds } })).lean();
    return ApiResponse.send(res, 200, { markSheets: docs.map(formatMarkSheet) }, 'Marks saved successfully');
  } finally {
    await session.endSession();
  }
};

// GET /api/v1/mark-sheets?assignmentId=...&monthKey=... - Admin: all, Teacher: only own assignment, Student: only own
// Paginated - ?page=1&limit=10&assignmentId=...&studentId=...&monthKey=2026-11
exports.getMarkSheets = async (req, res, next) => {
  let filter = {};
  if (req.query.assignmentId) filter.assignmentId = req.query.assignmentId;
  if (req.query.monthKey) filter.monthKey = req.query.monthKey;

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id }).lean();
    if (!student) return next(new ApiError('Student profile not found', 404));
    filter.studentId = student._id;
    if (req.query.studentId && String(req.query.studentId) !== String(student._id)) {
      return next(new ApiError('Not authorized to view other student marks', 403));
    }
  }
  if (req.query.studentId && req.user.role !== 'student') filter.studentId = req.query.studentId;

  if (req.user.role === 'teacher') {
    if (!req.query.assignmentId) return next(new ApiError('assignmentId is required for teacher', 400));
    // FIX: View allowed even if assignment is completed - only edit is blocked
    const { assignment } = await getAssignmentEffectiveMap(req.query.assignmentId, { allowCompleted: true });
    await checkTeacherAccess(assignment, req);
  }

  const { data, total, page, pages, limit, hasNextPage, hasPrevPage } = await paginate(MarkSheet, filter, {
    page: req.query.page,
    limit: req.query.limit,
    sort: { createdAt: 1 },
    populate: populateMarkSheet,
  });

  return ApiResponse.send(
    res,
    200,
    {
      markSheets: data.map(formatMarkSheet),
      pagination: { total, page, pages, limit, hasNextPage, hasPrevPage },
    },
    'Marks fetched successfully',
  );
};

// GET /api/v1/mark-sheets/:id - Admin: any, Teacher: only own assignment, Student: only own
exports.getMarkSheetById = async (req, res, next) => {
  const doc = await populateMarkSheet(MarkSheet.findById(req.params.id)).lean();
  if (!doc) return next(new ApiError('Mark sheet not found', 404));

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id }).lean();
    if (String(doc.studentId?._id || doc.studentId) !== String(student?._id)) {
      return next(new ApiError('Not authorized to view other student marks', 403));
    }
  }
  if (req.user.role === 'teacher') {
    // FIX: View allowed even if assignment is completed - only edit is blocked
    const { assignment } = await getAssignmentEffectiveMap(doc.assignmentId?._id || doc.assignmentId, { allowCompleted: true });
    await checkTeacherAccess(assignment, req);
  }

  return ApiResponse.send(res, 200, { markSheet: formatMarkSheet(doc) }, 'Mark sheet fetched successfully');
};

// NOTE - No DELETE endpoint - Marks are history, never delete
// NOTE - No single upsert endpoint - Bulk covers single student too, sheets array with 1 entry
