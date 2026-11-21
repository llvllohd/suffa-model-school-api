const Teacher = require('./teacher.model');
const ApiError = require('@/utils/apiError');

// Format a Teacher document into the standard API response shape.
// Renames `userId` to `user` and removes `__v`.
// `createdAt` / `updatedAt` are kept for audit / list sorting.
const formatTeacher = (teacher) => {
  if (!teacher) return null;
  const { userId, __v, ...rest } = teacher;
  return {
    ...rest,
    user: userId, // Populated User object
  };
};

// Fetch a Teacher by Teacher._id, but only if its linked User is active.
// Teacher is a profile only - `isActive` lives on User (global login), not on Teacher.
// Returns the teacher doc or null (never throws for inactive / missing).
// `session` is optional - Pass it when called inside a transaction (Allocation create / update).
const getActiveTeacherById = async (teacherId, session = null) => {
  const query = Teacher.findOne({ _id: teacherId }).populate('userId', 'isActive');
  if (session) query.session(session);
  const teacher = await query.lean();
  if (!teacher) return null;
  if (!teacher.userId?.isActive) return null;
  return teacher;
};

// Resolve User._id -> Teacher._id.
// Throws if no Teacher profile exists or if the linked User is inactive.
// `session` is optional - Pass it when called inside a transaction.
const getTeacherIdFromUser = async (userId, session = null) => {
  const query = Teacher.findOne({ userId }).populate('userId', 'isActive');
  if (session) query.session(session);
  const teacher = await query.lean();
  if (!teacher) throw new ApiError('Teacher profile not found', 404);
  if (!teacher.userId?.isActive) throw new ApiError('Teacher profile not found', 404);
  return teacher._id;
};

module.exports = {
  formatTeacher,
  getActiveTeacherById,
  getTeacherIdFromUser,
};
