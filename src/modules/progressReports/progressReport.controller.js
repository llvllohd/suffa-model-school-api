const MarkSheet = require('../markSheets/markSheet.model');
const Student = require('../students/student.model');
const SubjectAssignment = require('../subjectAssignments/subjectAssignment.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const { buildProgressReport, populateForReport } = require('./progressReport.helper');
const { getTeacherIdFromUser } = require('../teachers/teacher.helper');

// Teacher can view report only if they teach at least 1 subject to this student
// Checks: mainTeacher OR shared teacher (with valid share) on any assignment for this student + month
const checkTeacherCanViewStudent = async (req, studentId, monthKey) => {
  const teacherId = await getTeacherIdFromUser(req.user.id);
  const sheets = await MarkSheet.find({ studentId, monthKey }).select('assignmentId').lean();
  if (!sheets.length) return false;

  const assignmentIds = sheets.map((s) => s.assignmentId);
  // Shared teacher with expired share cannot view the report
  const count = await SubjectAssignment.countDocuments({
    _id: { $in: assignmentIds },
    isActive: true,
    $or: [
      { mainTeacherId: teacherId },
      {
        sharedToTeacherId: teacherId,
        $or: [{ sharedUntil: { $exists: false } }, { sharedUntil: null }, { sharedUntil: { $gte: new Date() } }],
      },
    ],
  });
  return count > 0;
};

// GET /api/v1/progress-reports?studentId=...&monthKey=2026-11
// Admin: any student, Teacher: only own students, Student: only own report
exports.getProgressReport = async (req, res, next) => {
  const { studentId, monthKey } = req.query;

  // Student can only view their own report
  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id }).lean();
    if (!student) return next(new ApiError('Student profile not found', 404));
    if (String(student._id) !== String(studentId)) {
      return next(new ApiError('Not authorized to view other student report', 403));
    }
  }

  if (req.user.role === 'teacher') {
    const allowed = await checkTeacherCanViewStudent(req, studentId, monthKey);
    if (!allowed) return next(new ApiError('Not authorized to view this student report', 403));
  }

  const sheets = await populateForReport(MarkSheet.find({ studentId, monthKey })).lean();
  if (!sheets.length) return next(new ApiError('No marks found for this month', 404));

  const report = buildProgressReport(sheets);
  return ApiResponse.send(res, 200, { progressReport: report }, 'Progress report fetched successfully');
};

// GET /api/v1/progress-reports/class?classId=...&sectionId=...&monthKey=2026-11
// Admin: any class, Teacher: only if they entered marks in that class + section + month
exports.getClassProgressReports = async (req, res, next) => {
  const { classId, sectionId, monthKey } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  if (req.user.role === 'student') {
    return next(new ApiError('Students cannot view class reports', 403));
  }

  // Teacher authorization: must have entered at least one MarkSheet
  // in this class + section + month. Checking any assignment would allow
  // a teacher to view reports for classes they do not teach.
  if (req.user.role === 'teacher') {
    const teacherId = await getTeacherIdFromUser(req.user.id);
    const anySheet = await MarkSheet.exists({
      classId,
      sectionId,
      monthKey,
      enteredByTeacherId: teacherId,
    });
    if (!anySheet) {
      return next(new ApiError('Not authorized to view this class report', 403));
    }
  }

  const distinctStudents = await MarkSheet.distinct('studentId', { classId, sectionId, monthKey });
  if (!distinctStudents.length) {
    return next(new ApiError('No marks found for this class and month', 404));
  }

  // Fetch all sheets in a single query to avoid N+1 queries
  const allSheets = await populateForReport(MarkSheet.find({ studentId: { $in: distinctStudents }, monthKey })).lean();

  // Group sheets by studentId in memory
  const grouped = new Map();
  allSheets.forEach((sheet) => {
    const key = String(sheet.studentId?._id || sheet.studentId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(sheet);
  });

  // Build reports for all students first, then assign ranks, then paginate
  // Ranking must use the full class, otherwise pagination would break ranks
  const allReports = [];
  grouped.forEach((sheets) => {
    const report = buildProgressReport(sheets);
    if (report) allReports.push(report);
  });

  // Rank by overall percentage - Topper gets Rank 1
  // Tie handling: Same percentage gets same rank
  allReports.sort((a, b) => b.overall.percentage - a.overall.percentage);
  let currentRank = 1;
  allReports.forEach((report, i) => {
    if (i > 0 && report.overall.percentage < allReports[i - 1].overall.percentage) {
      currentRank = i + 1;
    }
    report.rank = currentRank;
  });

  // Paginate after ranking so ranks stay correct across pages
  const total = allReports.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = allReports.slice(start, start + limit);

  return ApiResponse.send(
    res,
    200,
    {
      progressReports: paginated,
      pagination: {
        total,
        page,
        pages,
        limit,
        hasNextPage: page < pages,
        hasPrevPage: page > 1,
      },
    },
    'Class progress reports fetched successfully',
  );
};
