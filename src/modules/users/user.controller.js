const mongoose = require('mongoose');
const User = require('./user.model');
const TeacherProfile = require('@/modules/teachers/teacher.model');
const StudentProfile = require('@/modules/students/student.model');
const Class = require('@/modules/classes/class.model');
const Section = require('@/modules/sections/section.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');
const sendToken = require('@/utils/sendToken');
const { mergeUserProfile } = require('@/utils/sanitize');

// GET /api/v1/users/me - Any logged-in user
exports.getMe = async (req, res, next) => {
  if (req.user.isActive === false) return next(new ApiError('User not found', 404));

  let profile = null;
  if (req.user.role === 'teacher') {
    profile = await TeacherProfile.findOne({ userId: req.user.id });
  }
  if (req.user.role === 'student') {
    profile = await StudentProfile.findOne({ userId: req.user.id }).populate([
      { path: 'classId', select: 'name' },
      { path: 'sectionId', select: 'name' },
    ]);
  }
  return ApiResponse.send(res, 200, { user: mergeUserProfile(req.user, profile) });
};

// --- CREATE USER - Admin Only ---
exports.createUser = async (req, res, next) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    qualification,
    dateOfBirth,
    gender,
    address,
    // Student fields - Same names as student.model.js
    classId,
    sectionId,
    rollNumber,
    admissionNumber,
    guardianName,
    guardianPhone,
  } = req.body;

  // 1. Pre-check - Friendly 409 before transaction
  const existing = await User.findOne({ $or: [{ email }, { phone }], isActive: true }).select('email phone');
  if (existing) {
    if (existing.email === email) return next(new ApiError('Email already exists', 409));
    if (existing.phone === phone) return next(new ApiError('Phone already exists', 409));
  }

  // 2. Student: Class + Section must exist + Section must belong to Class
  if (role === 'student') {
    const [cls, section] = await Promise.all([
      Class.findOne({ _id: classId, isActive: true }).lean(),
      Section.findOne({ _id: sectionId, classId, isActive: true }).lean(),
    ]);
    if (!cls) return next(new ApiError('Class not found', 404));
    if (!section) return next(new ApiError('Section not found or does not belong to this Class', 404));

    // Roll number must be unique inside the same Class + same Section
    const rollExists = await StudentProfile.findOne({ classId, sectionId, rollNumber }).lean();
    if (rollExists) {
      // Roll number of a deleted (User inactive) student can be reused
      const rollUser = await User.findById(rollExists.userId).lean();
      if (rollUser && rollUser.isActive !== false) {
        return next(new ApiError(`Roll number ${rollNumber} already exists in this section`, 409));
      }
    }

    // Admission Number duplicate check - Deleted user numbers can be reused
    if (admissionNumber) {
      const admExists = await StudentProfile.findOne({ admissionNumber }).lean();
      if (admExists) {
        const admUser = await User.findById(admExists.userId).lean();
        if (admUser && admUser.isActive !== false) {
          return next(new ApiError('Admission Number already exists', 409));
        }
      }
    }
  }

  // 3. Transaction - User + Profile must both succeed or both fail
  // withTransaction handles commit / abort / retry automatically.
  // No try / catch needed here - any throw is caught by asyncHandlerMiddleware in the route.
  const session = await mongoose.startSession();
  let user = null;
  let profile = null;
  try {
    await session.withTransaction(async () => {
      [user] = await User.create([{ name, email, phone, password, role }], { session });

      if (role === 'teacher') {
        [profile] = await TeacherProfile.create([{ userId: user._id, qualification, dateOfBirth, gender, address }], { session });
      }
      if (role === 'student') {
        [profile] = await StudentProfile.create(
          [{ userId: user._id, classId, sectionId, rollNumber, admissionNumber, dateOfBirth, gender, address, guardianName, guardianPhone }],
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  if (profile && role === 'student') {
    await profile.populate([
      { path: 'classId', select: 'name' },
      { path: 'sectionId', select: 'name' },
    ]);
  }

  const message = `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`;
  return ApiResponse.send(res, 201, { user: mergeUserProfile(user, profile) }, message);
};

// PATCH /api/v1/users/me/password - Any logged-in user
exports.updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  if (!user || user.isActive === false) {
    return next(new ApiError('User not found', 404));
  }

  const isPasswordMatched = await user.comparePassword(oldPassword);
  if (!isPasswordMatched) {
    return next(new ApiError('The old password you entered is incorrect', 400));
  }

  user.password = newPassword;
  // Invalidate all existing refresh tokens after password change
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  await user.save();

  return sendToken(user, 200, res, 'Password updated successfully');
};
