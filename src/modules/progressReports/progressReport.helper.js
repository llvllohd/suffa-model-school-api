// Grade from percentage - Can be made school-wise configurable later
const getGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

// Convert all MarkSheets of 1 student into 1 Progress Report
const buildProgressReport = (sheets) => {
  if (!sheets.length) return null;

  const first = sheets[0];
  const studentDoc = first.studentId;

  const subjects = sheets.map((sheet) => {
    const percentage = sheet.totalMax > 0 ? (sheet.total / sheet.totalMax) * 100 : 0;
    return {
      assignmentId: sheet.assignmentId?._id || sheet.assignmentId,
      subject: sheet.assignmentId?.allocationId?.subjectId
        ? {
            _id: sheet.assignmentId.allocationId.subjectId._id,
            name: sheet.assignmentId.allocationId.subjectId.name,
          }
        : null,
      total: sheet.total,
      totalMax: sheet.totalMax,
      percentage: Number(percentage.toFixed(1)),
      grade: getGrade(percentage),
      marks: (sheet.marks || []).map((m) => ({
        categoryId: m.categoryId?._id || m.categoryId,
        name: m.categoryId?.name || null,
        obtainedMarks: m.obtainedMarks,
        maxMarks: m.maxMarks,
      })),
    };
  });

  // Sort subjects alphabetically by subject name
  subjects.sort((a, b) => (a.subject?.name || '').localeCompare(b.subject?.name || ''));

  const total = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalMax = subjects.reduce((sum, s) => sum + s.totalMax, 0);
  const overallPercentage = totalMax > 0 ? (total / totalMax) * 100 : 0;

  return {
    student: studentDoc
      ? {
          _id: studentDoc._id,
          rollNumber: studentDoc.rollNumber,
          name: studentDoc.userId?.name || null,
          phone: studentDoc.userId?.phone || null,
        }
      : null,
    classId: first.classId,
    sectionId: first.sectionId,
    semester: first.semester,
    monthKey: first.monthKey,
    subjects,
    overall: {
      total,
      totalMax,
      percentage: Number(overallPercentage.toFixed(1)),
      grade: getGrade(overallPercentage),
    },
  };
};

// Populate MarkSheet with data needed for Progress Report
const populateForReport = (query) =>
  query
    .populate({
      path: 'assignmentId',
      select: 'allocationId semester',
      populate: { path: 'allocationId', select: 'subjectId', populate: { path: 'subjectId', select: 'name' } },
    })
    .populate({
      path: 'studentId',
      select: 'rollNumber classId sectionId userId',
      populate: { path: 'userId', select: 'name phone' },
    })
    .populate({ path: 'marks.categoryId', select: 'name' });

module.exports = { getGrade, buildProgressReport, populateForReport };
