const TeacherProfile = require('@/modules/teachers/teacher.model');
const StudentProfile = require('@/modules/students/student.model');
const ApiResponse = require('./apiResponse');
const { mergeUserProfile } = require('./sanitize');
const { getCookieOptionsForToken, getCookieOptionsForRefreshToken } = require('./cookieOptions');

const sendToken = async (user, statusCode, res, message) => {
  const token = user.generateToken();
  const refreshToken = user.generateRefreshToken();

  // ✅ Fetch profile based on role + populate class/section
  let profile = null;
  if (user.role === 'teacher') {
    profile = await TeacherProfile.findOne({ userId: user._id });
  }
  if (user.role === 'student') {
    profile = await StudentProfile.findOne({ userId: user._id }).populate([
      { path: 'classId', select: 'name' },
      { path: 'sectionId', select: 'name' },
    ]);
  }

  res.cookie('token', token, getCookieOptionsForToken());
  res.cookie('refreshToken', refreshToken, getCookieOptionsForRefreshToken());

  return ApiResponse.send(res, statusCode, { user: mergeUserProfile(user, profile) }, message);
};

module.exports = sendToken;
