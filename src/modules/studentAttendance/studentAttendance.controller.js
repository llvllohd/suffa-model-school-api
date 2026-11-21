const StudentAttendance = require('./studentAttendance.model');
const Student = require('../students/student.model');
const SubjectAllocation = require('../subjectAllocations/subjectAllocation.model');
const SubjectAssignment = require('../subjectAssignments/subjectAssignment.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const paginate = require('@/utils/paginate');
const { getAssignmentForAttendance, formatAttendance, populateAttendance } = require('./studentAttendance.helper');
const { getTeacherIdFromUser } = require('../teachers/teacher.helper');

// Teacher access - main teacher (snapshot) or shared teacher with valid share
// Admin cannot take attendance - Section 3 Permission Table
const checkTeacherAccess = async (assignment, req) => {
  const teacherId = await getTeacherIdFromUser(req.user.id);
  const isMain = String(assignment.mainTeacherId) === String(teacherId);
  const isShared = String(assignment.sharedToTeacherId) === String(teacherId);
  if (!isMain && !isShared) throw new ApiError('Not authorized to take attendance for this assignment', 403);
  if (!isMain && isShared && assignment.sharedUntil && new Date(assignment.sharedUntil) < new Date()) {
    throw new ApiError('Share expired', 403);
  }
  return teacherId;
};

// Teacher can view attendance only if they teach this class + section
// Checks: Allocation mainTeacher OR Monthly Assignment main/shared (valid share) for this class + section
const checkTeacherCanViewClass = async (teacherId, classId, sectionId) => {
  const allocation = await SubjectAllocation.exists({
    isActive: true,
    classId,
    sectionIds: sectionId,
    mainTeacherId: teacherId,
  });
  if (allocation) return true;

  // Shared teacher - check via Monthly Assignment -> Allocation
  const assignments = await SubjectAssignment.find({
    isActive: true,
    $or: [
      { mainTeacherId: teacherId },
      {
        sharedToTeacherId: teacherId,
        $or: [{ sharedUntil: { $exists: false } }, { sharedUntil: null }, { sharedUntil: { $gte: new Date() } }],
      },
    ],
  })
    .populate({ path: 'allocationId', select: 'classId sectionIds', match: { isActive: true, classId, sectionIds: sectionId } })
    .lean();

  return assignments.some((a) => a.allocationId);
};

// POST /api/v1/student-attendance - Teacher takes full class attendance in one call
// Role: teacher only - Admin cannot take student attendance
// Second POST same class + section + date = Update, not duplicate
exports.upsertStudentAttendance = async (req, res, next) => {
  const { assignmentId, date, records } = req.body;

  const assignment = await getAssignmentForAttendance(assignmentId);
  const teacherId = await checkTeacherAccess(assignment, req);

  const classId = assignment.allocationId.classId;
  const allocationSectionIds = (assignment.allocationId?.sectionIds || []).map((id) => String(id));

  // Duplicate student in same call - reject before any save
  const seenStudents = new Set();
  for (const record of records) {
    const key = String(record.studentId);
    if (seenStudents.has(key)) throw new ApiError(`Duplicate student in records: ${record.studentId}`, 400);
    seenStudents.add(key);
  }

  // Attendance is per section - Allocation can have [A, B], but 1 attendance entry = 1 section
  // All students in this call must belong to SAME section
  const sectionIdsInCall = new Set();
  const normalizedRecords = [];

  for (const record of records) {
    const student = await Student.findOne({ _id: record.studentId }).populate('userId', 'isActive').lean();
    if (!student) throw new ApiError(`Student not found: ${record.studentId}`, 404);
    if (!student.userId?.isActive) throw new ApiError('Student is not active', 400);
    if (String(student.classId) !== String(classId)) {
      throw new ApiError('Student does not belong to this allocation class', 400);
    }
    if (!allocationSectionIds.includes(String(student.sectionId))) {
      throw new ApiError('Student does not belong to this allocation section', 400);
    }
    sectionIdsInCall.add(String(student.sectionId));
    normalizedRecords.push({
      studentId: record.studentId,
      status: record.status,
      reason: record.status === 'Absent' ? record.reason || '' : '',
    });
  }

  if (sectionIdsInCall.size > 1) {
    throw new ApiError('All students must belong to same section for one attendance entry', 400);
  }
  const sectionId = [...sectionIdsInCall][0];

  // Partial records = data loss - Full class is required
  // If teacher sends only 5 of 30 students, remaining 25 would be deleted on update
  const allActiveStudents = await Student.find({ classId, sectionId }).populate('userId', 'isActive').lean();
  const expectedCount = allActiveStudents.filter((s) => s.userId?.isActive !== false).length;
  if (records.length !== expectedCount) {
    throw new ApiError(`Attendance for all ${expectedCount} students is required, got ${records.length}`, 400);
  }

  const existing = await StudentAttendance.findOne({ classId, sectionId, date });

  if (existing) {
    existing.records = normalizedRecords;
    existing.takenByTeacherId = teacherId;
    await existing.save();
    const doc = await populateAttendance(StudentAttendance.findById(existing._id)).lean();
    return ApiResponse.send(res, 200, { attendance: formatAttendance(doc) }, 'Student attendance updated successfully');
  }

  const created = await StudentAttendance.create({
    classId,
    sectionId,
    date,
    takenByTeacherId: teacherId,
    records: normalizedRecords,
  });
  const doc = await populateAttendance(StudentAttendance.findById(created._id)).lean();
  return ApiResponse.send(res, 201, { attendance: formatAttendance(doc) }, 'Student attendance saved successfully');
};

// GET /api/v1/student-attendance?classId=&sectionId=&date=&monthKey= - Admin: all, Teacher: own class
exports.getStudentAttendance = async (req, res, next) => {
  const filter = {};
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.sectionId) filter.sectionId = req.query.sectionId;
  if (req.query.date) filter.date = req.query.date;
  else if (req.query.monthKey) filter.date = { $regex: `^${req.query.monthKey}` };

  if (req.user.role === 'teacher') {
    if (!req.query.classId || !req.query.sectionId) {
      return next(new ApiError('classId and sectionId are required for teacher', 400));
    }
    // Teacher must actually teach this class + section, not just pass classId
    const teacherId = await getTeacherIdFromUser(req.user.id);
    const allowed = await checkTeacherCanViewClass(teacherId, req.query.classId, req.query.sectionId);
    if (!allowed) return next(new ApiError('Not authorized to view this class attendance', 403));
  }

  const { data, total, page, pages, limit, hasNextPage, hasPrevPage } = await paginate(StudentAttendance, filter, {
    page: req.query.page,
    limit: req.query.limit,
    sort: { date: -1 },
    populate: populateAttendance,
  });

  return ApiResponse.send(
    res,
    200,
    {
      attendance: data.map(formatAttendance),
      pagination: { total, page, pages, limit, hasNextPage, hasPrevPage },
    },
    'Student attendance fetched successfully',
  );
};

// GET /api/v1/student-attendance/:id - Admin: any, Teacher: own class only
exports.getStudentAttendanceById = async (req, res, next) => {
  const doc = await populateAttendance(StudentAttendance.findById(req.params.id)).lean();
  if (!doc) return next(new ApiError('Attendance not found', 404));

  // Teacher cannot view any :id - must teach this class + section
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    const allowed = await checkTeacherCanViewClass(teacherId, doc.classId?._id || doc.classId, doc.sectionId?._id || doc.sectionId);
    if (!allowed) return next(new ApiError('Not authorized to view this class attendance', 403));
  }

  return ApiResponse.send(res, 200, { attendance: formatAttendance(doc) }, 'Student attendance fetched successfully');
};

// GET /api/v1/student-attendance/my?monthKey=2026-11 - Student only - Own
exports.getMyAttendance = async (req, res, next) => {
  const { monthKey } = req.query;
  const student = await Student.findOne({ userId: req.user.id }).lean();
  if (!student) return next(new ApiError('Student profile not found', 404));

  const docs = await StudentAttendance.find({
    classId: student.classId,
    sectionId: student.sectionId,
    date: { $regex: `^${monthKey}` },
  }).lean();

  const records = [];
  let totalPresent = 0;
  let totalAbsent = 0;
  docs.forEach((doc) => {
    const rec = doc.records.find((r) => String(r.studentId) === String(student._id));
    if (rec) {
      records.push({ date: doc.date, status: rec.status, reason: rec.reason || '' });
      if (rec.status === 'Present') totalPresent += 1;
      else totalAbsent += 1;
    }
  });

  const totalDays = totalPresent + totalAbsent;
  const percentage = totalDays > 0 ? Number(((totalPresent / totalDays) * 100).toFixed(1)) : 0;

  return ApiResponse.send(
    res,
    200,
    { attendance: { monthKey, totalDays, totalPresent, totalAbsent, percentage, records } },
    'My attendance fetched successfully',
  );
};

// GET /api/v1/student-attendance/summary?studentId=&monthKey= - Admin + Teacher + Student (own)
// Used by Progress Report for attendance %
exports.getAttendanceSummary = async (req, res, next) => {
  const { studentId, monthKey } = req.query;

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id }).lean();
    if (!student || String(student._id) !== String(studentId)) {
      return next(new ApiError('Not authorized to view other student attendance', 403));
    }
  }

  const student = await Student.findById(studentId).lean();
  if (!student) return next(new ApiError('Student not found', 404));

  // Teacher viewing summary must teach this student's class + section
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    const allowed = await checkTeacherCanViewClass(teacherId, student.classId, student.sectionId);
    if (!allowed) return next(new ApiError('Not authorized to view this student attendance', 403));
  }

  const docs = await StudentAttendance.find({
    classId: student.classId,
    sectionId: student.sectionId,
    date: { $regex: `^${monthKey}` },
  }).lean();

  let totalPresent = 0;
  let totalAbsent = 0;
  const absentDays = [];
  docs.forEach((doc) => {
    const rec = doc.records.find((r) => String(r.studentId) === String(studentId));
    if (rec) {
      if (rec.status === 'Present') totalPresent += 1;
      else {
        totalAbsent += 1;
        absentDays.push({ date: doc.date, reason: rec.reason || '' });
      }
    }
  });

  const totalDays = totalPresent + totalAbsent;
  const percentage = totalDays > 0 ? Number(((totalPresent / totalDays) * 100).toFixed(1)) : 0;

  return ApiResponse.send(
    res,
    200,
    { attendance: { studentId, monthKey, totalDays, totalPresent, totalAbsent, percentage, absentDays } },
    'Attendance summary fetched successfully',
  );
};

// NOTE - No DELETE endpoint - Attendance is history, never delete
