const SubjectAssignment = require('../subjectAssignments/subjectAssignment.model');
const ApiError = require('@/utils/apiError');
const { formatTeacher } = require('../teachers/teacher.helper');

// Get assignment + allocation for attendance - classId/sectionId come from Allocation, never from client
const getAssignmentForAttendance = async (assignmentId) => {
  const assignment = await SubjectAssignment.findOne({ _id: assignmentId, isActive: true }).populate('allocationId', 'classId sectionIds').lean();

  if (!assignment) throw new ApiError('Assignment not found', 404);
  if (!assignment.allocationId) throw new ApiError('Allocation not found for this assignment', 404);
  return assignment;
};

const formatAttendance = (doc) => {
  if (!doc) return null;
  const { records, takenByTeacherId, __v, ...rest } = doc;
  return {
    ...rest,
    takenByTeacher: formatTeacher(takenByTeacherId),
    records: (records || []).map((r) => ({
      student: r.studentId,
      status: r.status,
      reason: r.reason || '',
    })),
  };
};

const populateAttendance = (query) =>
  query
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .populate({
      path: 'records.studentId',
      select: 'rollNo classId sectionId userId',
      populate: { path: 'userId', select: 'name phone email' },
    })
    .populate({ path: 'takenByTeacherId', populate: { path: 'userId', select: 'name email phone role avatar isActive' } });

module.exports = { getAssignmentForAttendance, formatAttendance, populateAttendance };
