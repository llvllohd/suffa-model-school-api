const Student = require('../students/student.model');
const Teacher = require('../teachers/teacher.model');
const Class = require('../classes/class.model');
const Subject = require('../subjects/subject.model');
const SubjectAllocation = require('../subjectAllocations/subjectAllocation.model');
const SubjectAssignment = require('../subjectAssignments/subjectAssignment.model');
const MarkSheet = require('../markSheets/markSheet.model');
const StudentAttendance = require('../studentAttendance/studentAttendance.model');
const TeacherAttendance = require('../teacherAttendance/teacherAttendance.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const { getTeacherIdFromUser } = require('../teachers/teacher.helper');

// Defaults - date = today (IST), monthKey = current month (YYYY-MM)
const getDefaults = (query) => {
  // Use IST date, not UTC - toISOString() can return next day in India after 5:30 AM UTC
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  return {
    date: query.date || today,
    monthKey: query.monthKey || today.slice(0, 7), // YYYY-MM
  };
};

const getPercentage = (present, total) => (total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0);

// Count only active users - users with User.isActive = false are excluded
const countActive = async (Model) => {
  const docs = await Model.find({}).populate('userId', 'isActive').lean();
  return docs.filter((d) => d.userId?.isActive !== false).length;
};

// GET /api/v1/dashboard/admin - Admin only
exports.getAdminDashboard = async (req, res, next) => {
  const { date, monthKey } = getDefaults(req.query);

  const [totalStudents, totalTeachers, totalClasses, totalSubjects, totalAssignments, totalMarkSheets] = await Promise.all([
    countActive(Student),
    countActive(Teacher),
    Class.countDocuments({ isActive: true }),
    Subject.countDocuments({ isActive: true }),
    SubjectAssignment.countDocuments({ isActive: true }),
    MarkSheet.countDocuments({ isActive: true }),
  ]);

  // Today - Student Attendance: totals across all classes
  const todayStudentDocs = await StudentAttendance.find({ date }).lean();
  const todayStudentPresent = todayStudentDocs.reduce((sum, d) => sum + d.totalPresent, 0);
  const todayStudentAbsent = todayStudentDocs.reduce((sum, d) => sum + d.totalAbsent, 0);
  const todayStudentTotal = todayStudentPresent + todayStudentAbsent;

  // Today - Teacher Attendance: 1 doc holds all teachers
  const todayTeacherDoc = await TeacherAttendance.findOne({ date }).lean();
  const todayTeacherPresent = todayTeacherDoc?.totalPresent || 0;
  const todayTeacherAbsent = todayTeacherDoc?.totalAbsent || 0;
  const todayTeacherTotal = todayTeacherPresent + todayTeacherAbsent;

  // Month - Student + Teacher totals
  const monthStudentDocs = await StudentAttendance.find({ date: { $regex: `^${monthKey}` } }).lean();
  const monthStudentPresent = monthStudentDocs.reduce((sum, d) => sum + d.totalPresent, 0);
  const monthStudentAbsent = monthStudentDocs.reduce((sum, d) => sum + d.totalAbsent, 0);
  const monthStudentTotal = monthStudentPresent + monthStudentAbsent;

  const monthTeacherDocs = await TeacherAttendance.find({ date: { $regex: `^${monthKey}` } }).lean();
  const monthTeacherPresent = monthTeacherDocs.reduce((sum, d) => sum + d.totalPresent, 0);
  const monthTeacherAbsent = monthTeacherDocs.reduce((sum, d) => sum + d.totalAbsent, 0);
  const monthTeacherTotal = monthTeacherPresent + monthTeacherAbsent;

  return ApiResponse.send(
    res,
    200,
    {
      dashboard: {
        date,
        monthKey,
        counts: { totalStudents, totalTeachers, totalClasses, totalSubjects, totalAssignments, totalMarkSheets },
        today: {
          studentAttendance: {
            total: todayStudentTotal,
            present: todayStudentPresent,
            absent: todayStudentAbsent,
            percentage: getPercentage(todayStudentPresent, todayStudentTotal),
            classesTaken: todayStudentDocs.length, // Number of class-sections whose attendance was taken
          },
          teacherAttendance: {
            total: todayTeacherTotal,
            present: todayTeacherPresent,
            absent: todayTeacherAbsent,
            percentage: getPercentage(todayTeacherPresent, todayTeacherTotal),
            taken: !!todayTeacherDoc, // Whether today's teacher attendance was taken or not
          },
        },
        month: {
          studentAttendance: {
            total: monthStudentTotal,
            present: monthStudentPresent,
            absent: monthStudentAbsent,
            percentage: getPercentage(monthStudentPresent, monthStudentTotal),
          },
          teacherAttendance: {
            total: monthTeacherTotal,
            present: monthTeacherPresent,
            absent: monthTeacherAbsent,
            percentage: getPercentage(monthTeacherPresent, monthTeacherTotal),
          },
        },
      },
    },
    'Admin dashboard fetched successfully',
  );
};

// GET /api/v1/dashboard/teacher - Teacher only
exports.getTeacherDashboard = async (req, res, next) => {
  const { date, monthKey } = getDefaults(req.query);
  const teacherId = await getTeacherIdFromUser(req.user.id);

  const [myAllocations, myAssignments] = await Promise.all([
    SubjectAllocation.find({ isActive: true, mainTeacherId: teacherId }).lean(),
    // Same rule as list API - Expired shared assignments are excluded
    // sharedUntil = null means no expiry, sharedUntil > now means still shared
    SubjectAssignment.find({
      isActive: true,
      $or: [{ mainTeacherId: teacherId }, { sharedToTeacherId: teacherId, $or: [{ sharedUntil: null }, { sharedUntil: { $gt: new Date() } }] }],
    }).lean(),
  ]);

  // Count distinct class-sections from allocations
  const classSectionSet = new Set();
  myAllocations.forEach((a) => (a.sectionIds || []).forEach((s) => classSectionSet.add(`${a.classId}-${s}`)));
  const myClasses = classSectionSet.size;

  // Attendance taken by this teacher today
  const todayTaken = await StudentAttendance.countDocuments({ date, takenByTeacherId: teacherId });
  const pendingToday = Math.max(0, myClasses - todayTaken);

  // Attendance taken by this teacher this month
  const monthTaken = await StudentAttendance.countDocuments({ date: { $regex: `^${monthKey}` }, takenByTeacherId: teacherId });

  // Teacher's own monthly attendance
  const myDocs = await TeacherAttendance.find({ date: { $regex: `^${monthKey}` } }).lean();
  let totalPresent = 0;
  let totalAbsent = 0;
  myDocs.forEach((doc) => {
    const rec = doc.records.find((r) => String(r.teacherId) === String(teacherId));
    if (rec) {
      if (rec.status === 'Present') totalPresent += 1;
      else totalAbsent += 1;
    }
  });
  const totalDays = totalPresent + totalAbsent;

  return ApiResponse.send(
    res,
    200,
    {
      dashboard: {
        date,
        monthKey,
        counts: { myClasses, myAllocations: myAllocations.length, myAssignments: myAssignments.length },
        today: { classesTaken: todayTaken, pendingToday },
        month: { classesTaken: monthTaken },
        myAttendance: { totalDays, totalPresent, totalAbsent, percentage: getPercentage(totalPresent, totalDays) },
      },
    },
    'Teacher dashboard fetched successfully',
  );
};

// GET /api/v1/dashboard/student - Student only
exports.getStudentDashboard = async (req, res, next) => {
  const { monthKey } = getDefaults(req.query);
  const student = await Student.findOne({ userId: req.user.id }).populate('classId', 'name').populate('sectionId', 'name').lean();
  if (!student) return next(new ApiError('Student profile not found', 404));

  // Student's monthly attendance
  const docs = await StudentAttendance.find({
    classId: student.classId?._id || student.classId,
    sectionId: student.sectionId?._id || student.sectionId,
    date: { $regex: `^${monthKey}` },
  }).lean();

  let totalPresent = 0;
  let totalAbsent = 0;
  docs.forEach((doc) => {
    const rec = doc.records.find((r) => String(r.studentId) === String(student._id));
    if (rec) {
      if (rec.status === 'Present') totalPresent += 1;
      else totalAbsent += 1;
    }
  });
  const totalDays = totalPresent + totalAbsent;

  // No ProgressReport model exists - ProgressReport is derived from MarkSheet
  // So the latest MarkSheet represents the latest progress
  const latestMarkSheet = await MarkSheet.findOne({ studentId: student._id, isActive: true }).sort({ createdAt: -1 }).lean();

  return ApiResponse.send(
    res,
    200,
    {
      dashboard: {
        monthKey,
        student: { className: student.classId?.name || '', sectionName: student.sectionId?.name || '', rollNo: student.rollNo || '' },
        myAttendance: { totalDays, totalPresent, totalAbsent, percentage: getPercentage(totalPresent, totalDays) },
        latestMarkSheet: latestMarkSheet || null,
      },
    },
    'Student dashboard fetched successfully',
  );
};
