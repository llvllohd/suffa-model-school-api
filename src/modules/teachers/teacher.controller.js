const mongoose = require('mongoose');
const Teacher = require('./teacher.model');
const User = require('../users/user.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const { formatTeacher } = require('./teacher.helper');

// GET /api/v1/teachers - Admin Only
exports.getTeachers = async (req, res, next) => {
  const teachers = await Teacher.find()
    .sort({ createdAt: -1 })
    .populate({ path: 'userId', select: 'name email phone role avatar isActive', match: { isActive: true } })
    .lean();

  // Drop teachers whose User is deleted / inactive (populate returns null for them).
  const cleaned = teachers.filter((t) => t.userId).map(formatTeacher);

  return ApiResponse.send(res, 200, { teachers: cleaned }, 'Teachers fetched successfully');
};

// GET /api/v1/teachers/:id - Admin, Teacher (own profile only)
exports.getTeacherById = async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id).populate('userId', 'name email phone role avatar isActive').lean();

  if (!teacher || !teacher.userId || teacher.userId.isActive === false) return next(new ApiError('Teacher not found', 404));

  // A teacher can only view their own profile.
  if (req.user.role === 'teacher' && String(teacher.userId._id) !== String(req.user.id)) {
    return next(new ApiError('Not authorized to view this profile', 403));
  }

  return ApiResponse.send(res, 200, { teacher: formatTeacher(teacher) }, 'Teacher fetched successfully');
};

// PATCH /api/v1/teachers/:id - Admin Only
exports.updateTeacher = async (req, res, next) => {
  const { name, qualification, dateOfBirth, gender, address } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return next(new ApiError('Teacher not found', 404));

  const user = await User.findById(teacher.userId).lean();
  if (!user || user.isActive === false) return next(new ApiError('Teacher not found', 404));

  // Transaction - Teacher + User must both succeed or both fail.
  // withTransaction handles commit / abort / retry automatically.
  // No try / catch needed here - any throw is caught by asyncHandlerMiddleware in the route.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Update Teacher profile fields.
      if (qualification !== undefined) teacher.qualification = qualification;
      if (dateOfBirth !== undefined) teacher.dateOfBirth = dateOfBirth;
      if (gender !== undefined) teacher.gender = gender;
      if (address !== undefined) teacher.address = address;
      await teacher.save({ session });

      // Name lives on User, not on the Teacher profile.
      if (name !== undefined) {
        await User.findByIdAndUpdate(teacher.userId, { name }, { runValidators: true, session });
      }
    });
  } finally {
    await session.endSession();
  }

  // Keep the response shape same as list / detail - includes `isActive` via populated User.
  const updated = await Teacher.findById(teacher._id).populate('userId', 'name email phone role avatar isActive').lean();
  return ApiResponse.send(res, 200, { teacher: formatTeacher(updated) }, 'Teacher updated successfully');
};

// DELETE /api/v1/teachers/:id - Soft Delete - Admin Only
exports.deleteTeacher = async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return next(new ApiError('Teacher not found', 404));

  const user = await User.findById(teacher.userId);
  if (!user || user.isActive === false) return next(new ApiError('Teacher not found', 404));

  // Soft delete - deactivate the User only, keep the Teacher row for history.
  user.isActive = false;
  await user.save();
  return ApiResponse.send(res, 200, null, 'Teacher deleted successfully');
};
