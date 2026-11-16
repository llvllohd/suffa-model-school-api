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

exports.getMe = async (req, res, next) => {
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
  const { name, email, phone, password, role, qualification, dateOfBirth, gender, address, rollNo, classId, sectionId, parentName } = req.body;

  // 1. Pre-check - Friendly 409 before transaction
  const existing = await User.findOne({ $or: [{ email }, { phone }] }).select('email phone');
  if (existing) {
    if (existing.email === email) return next(new ApiError('Email already exists', 409));
    if (existing.phone === phone) return next(new ApiError('Phone already exists', 409));
  }

  // 2. Student: Class + Section must exist + Section must belong to Class
  if (role === 'student') {
    const [cls, section] = await Promise.all([Class.findById(classId), Section.findById(sectionId)]);
    if (!cls) return next(new ApiError('Class not found', 404));
    if (!section) return next(new ApiError('Section not found', 404));
    if (String(section.classId) !== String(classId)) {
      return next(new ApiError('Section does not belong to this class', 400));
    }
    const rollExists = await StudentProfile.findOne({ sectionId, rollNo });
    if (rollExists) return next(new ApiError(`Roll number ${rollNo} already exists in this section`, 409));
  }

  // 3. Transaction - User + Profile must both succeed or both fail
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [user] = await User.create([{ name, email, phone, password, role }], { session });

    let profile = null;
    if (role === 'teacher') {
      [profile] = await TeacherProfile.create([{ userId: user._id, qualification, dateOfBirth, gender, address }], { session });
    }
    if (role === 'student') {
      [profile] = await StudentProfile.create([{ userId: user._id, rollNo, classId, sectionId, parentName, dateOfBirth, gender, address }], { session });
    }

    await session.commitTransaction();

    if (profile && role === 'student') {
      await profile.populate([
        { path: 'classId', select: 'name' },
        { path: 'sectionId', select: 'name' },
      ]);
    }

    const message = `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`;
    return ApiResponse.send(res, 201, { user: mergeUserProfile(user, profile) }, message);
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    return next(err);
  } finally {
    session.endSession();
  }
};
exports.updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new ApiError('User not found', 404));
  }

  const isPasswordMatched = await user.comparePassword(oldPassword);
  if (!isPasswordMatched) {
    return next(new ApiError('The old password you entered is incorrect', 400));
  }

  user.password = newPassword;
  user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
  await user.save();

  return sendToken(user, 200, res, 'Password updated successfully');
};
