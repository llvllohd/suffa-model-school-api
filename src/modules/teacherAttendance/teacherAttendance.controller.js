const TeacherAttendance = require('./teacherAttendance.model');
const Teacher = require('../teachers/teacher.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const paginate = require('@/utils/paginate');
const { formatTeacherAttendance, populateTeacherAttendance } = require('./teacherAttendance.helper');
const { getTeacherIdFromUser } = require('../teachers/teacher.helper');

// POST /api/v1/teacher-attendance - Admin takes all teachers attendance in one call
// Role: admin only - Teacher cannot take own attendance
// Second POST same date = Update, not duplicate
exports.upsertTeacherAttendance = async (req, res, next) => {
  const { date, records } = req.body;

  // Duplicate teacher in same call - reject before any save
  const seenTeachers = new Set();
  for (const record of records) {
    const key = String(record.teacherId);
    if (seenTeachers.has(key)) throw new ApiError(`Duplicate teacher in records: ${record.teacherId}`, 400);
    seenTeachers.add(key);
  }

  const normalizedRecords = [];

  for (const record of records) {
    const teacher = await Teacher.findOne({ _id: record.teacherId }).populate('userId', 'isActive').lean();
    if (!teacher) throw new ApiError(`Teacher not found: ${record.teacherId}`, 404);
    if (!teacher.userId?.isActive) throw new ApiError('Teacher is not active', 400);
    normalizedRecords.push({
      teacherId: record.teacherId,
      status: record.status,
      // Present pe reason ka matlab nahi - sirf Absent pe save karo
      // Leave ho to reason me likho: "Sick Leave" / "Personal Leave"
      reason: record.status === 'Absent' ? record.reason || '' : '',
    });
  }

  // Partial records = data loss - Full staff is required
  const allActiveTeachers = await Teacher.find({}).populate('userId', 'isActive').lean();
  const expectedCount = allActiveTeachers.filter((t) => t.userId?.isActive !== false).length;
  if (records.length !== expectedCount) {
    throw new ApiError(`Attendance for all ${expectedCount} teachers is required, got ${records.length}`, 400);
  }

  const existing = await TeacherAttendance.findOne({ date });

  if (existing) {
    existing.records = normalizedRecords;
    existing.takenByAdminId = req.user.id;
    await existing.save();
    const doc = await populateTeacherAttendance(TeacherAttendance.findById(existing._id)).lean();
    return ApiResponse.send(res, 200, { attendance: formatTeacherAttendance(doc) }, 'Teacher attendance updated successfully');
  }

  const created = await TeacherAttendance.create({
    date,
    takenByAdminId: req.user.id,
    records: normalizedRecords,
  });
  const doc = await populateTeacherAttendance(TeacherAttendance.findById(created._id)).lean();
  return ApiResponse.send(res, 201, { attendance: formatTeacherAttendance(doc) }, 'Teacher attendance saved successfully');
};

// GET /api/v1/teacher-attendance?date=&monthKey= - Admin only
// Teacher dusre teachers ki attendance nahi dekh sakta - privacy
exports.getTeacherAttendance = async (req, res, next) => {
  const filter = {};
  if (req.query.date) filter.date = req.query.date;
  else if (req.query.monthKey) filter.date = { $regex: `^${req.query.monthKey}` };

  const { data, total, page, pages, limit, hasNextPage, hasPrevPage } = await paginate(TeacherAttendance, filter, {
    page: req.query.page,
    limit: req.query.limit,
    sort: { date: -1 },
    populate: populateTeacherAttendance,
  });

  return ApiResponse.send(
    res,
    200,
    { attendance: data.map(formatTeacherAttendance), pagination: { total, page, pages, limit, hasNextPage, hasPrevPage } },
    'Teacher attendance fetched successfully',
  );
};

// GET /api/v1/teacher-attendance/:id - Admin only
exports.getTeacherAttendanceById = async (req, res, next) => {
  const doc = await populateTeacherAttendance(TeacherAttendance.findById(req.params.id)).lean();
  if (!doc) return next(new ApiError('Attendance not found', 404));
  return ApiResponse.send(res, 200, { attendance: formatTeacherAttendance(doc) }, 'Teacher attendance fetched successfully');
};

// GET /api/v1/teacher-attendance/my?monthKey=2026-11 - Teacher only - Own
exports.getMyTeacherAttendance = async (req, res, next) => {
  const { monthKey } = req.query;
  const teacherId = await getTeacherIdFromUser(req.user.id);

  const docs = await TeacherAttendance.find({ date: { $regex: `^${monthKey}` } }).lean();

  const records = [];
  let totalPresent = 0;
  let totalAbsent = 0;
  docs.forEach((doc) => {
    const rec = doc.records.find((r) => String(r.teacherId) === String(teacherId));
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

// GET /api/v1/teacher-attendance/summary?teacherId=&monthKey= - Admin + Teacher (own)
exports.getTeacherAttendanceSummary = async (req, res, next) => {
  const { teacherId, monthKey } = req.query;

  // Teacher sirf apni dekh sakta hai
  if (req.user.role === 'teacher') {
    const myTeacherId = await getTeacherIdFromUser(req.user.id);
    if (String(myTeacherId) !== String(teacherId)) {
      return next(new ApiError('Not authorized to view other teacher attendance', 403));
    }
  }

  const teacher = await Teacher.findById(teacherId).lean();
  if (!teacher) return next(new ApiError('Teacher not found', 404));

  const docs = await TeacherAttendance.find({ date: { $regex: `^${monthKey}` } }).lean();

  let totalPresent = 0;
  let totalAbsent = 0;
  const absentDays = [];
  docs.forEach((doc) => {
    const rec = doc.records.find((r) => String(r.teacherId) === String(teacherId));
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
    { attendance: { teacherId, monthKey, totalDays, totalPresent, totalAbsent, percentage, absentDays } },
    'Teacher attendance summary fetched successfully',
  );
};

// NOTE - No DELETE endpoint - Attendance is history, never delete
