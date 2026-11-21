const mongoose = require('mongoose');
const Student = require('./student.model');
const User = require('../users/user.model');
const Section = require('../sections/section.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');

// Helper - Convert Student to standard response shape
// Rename userId -> user, classId -> class, sectionId -> section, remove __v
const formatStudent = (student) => {
  if (!student) return null;
  const { userId, classId, sectionId, __v, ...rest } = student;
  return {
    ...rest,
    user: userId, // Populated User object
    class: classId, // Populated Class object
    section: sectionId, // Populated Section object
  };
};

// GET /api/v1/students - Admin, Teacher - ?classId= & ?sectionId= filter
exports.getStudents = async (req, res, next) => {
  const filter = {};
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.sectionId) filter.sectionId = req.query.sectionId;

  const students = await Student.find(filter)
    .sort({ classId: 1, sectionId: 1, rollNumber: 1 })
    .populate({ path: 'userId', select: 'name phone role avatar isActive', match: { isActive: true } })
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .lean();

  // Filter out students whose user is deleted / inactive
  const cleaned = students.filter((s) => s.userId).map(formatStudent);
  return ApiResponse.send(res, 200, { students: cleaned }, 'Students fetched successfully');
};

// GET /api/v1/students/:id - Admin, Teacher, Student (Own only)
exports.getStudentById = async (req, res, next) => {
  const student = await Student.findById(req.params.id)
    .populate('userId', 'name phone role avatar isActive')
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .lean();
  if (!student || !student.userId || student.userId.isActive === false) return next(new ApiError('Student not found', 404));

  if (req.user.role === 'student' && String(student.userId._id) !== String(req.user.id)) {
    return next(new ApiError('Not authorized to view this profile', 403));
  }
  return ApiResponse.send(res, 200, { student: formatStudent(student) }, 'Student fetched successfully');
};

// PATCH /api/v1/students/:id - Admin Only - Class / Section change = Promotion like
exports.updateStudent = async (req, res, next) => {
  const { name, classId, sectionId, rollNumber, admissionNumber, dateOfBirth, gender, address, guardianName, guardianPhone } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) return next(new ApiError('Student not found', 404));

  const user = await User.findById(student.userId).lean();
  if (!user || user.isActive === false) return next(new ApiError('Student not found', 404));

  const finalClassId = classId ?? student.classId;
  const finalSectionId = sectionId ?? student.sectionId;
  const finalRoll = rollNumber ?? student.rollNumber;

  // If Class / Section / Roll changed then validate
  if (classId !== undefined || sectionId !== undefined || rollNumber !== undefined) {
    const section = await Section.findOne({ _id: finalSectionId, classId: finalClassId, isActive: true }).lean();
    if (!section) return next(new ApiError('Section not found or does not belong to this Class', 404));

    const existingRoll = await Student.findOne({ classId: finalClassId, sectionId: finalSectionId, rollNumber: finalRoll, _id: { $ne: student._id } }).lean();
    if (existingRoll) {
      const rollUser = await User.findById(existingRoll.userId).lean();
      if (rollUser && rollUser.isActive !== false) return next(new ApiError('Roll Number already exists in this Section', 409));
    }
  }

  // Admission Number duplicate check - Deleted user wale reuse ho sakte hai
  if (admissionNumber !== undefined) {
    const existingAdm = await Student.findOne({ admissionNumber, _id: { $ne: student._id } }).lean();
    if (existingAdm) {
      const admUser = await User.findById(existingAdm.userId).lean();
      if (admUser && admUser.isActive !== false) return next(new ApiError('Admission Number already exists', 409));
    }
  }

  // Transaction - Student + User must both succeed or both fail
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (classId !== undefined) student.classId = classId;
    if (sectionId !== undefined) student.sectionId = sectionId;
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (admissionNumber !== undefined) student.admissionNumber = admissionNumber;
    if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth;
    if (gender !== undefined) student.gender = gender;
    if (address !== undefined) student.address = address;
    if (guardianName !== undefined) student.guardianName = guardianName;
    if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
    await student.save({ session });

    // Name lives in User collection, not in Student profile
    if (name !== undefined) {
      await User.findByIdAndUpdate(student.userId, { name }, { runValidators: true, session });
    }

    await session.commitTransaction();
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    return next(err);
  } finally {
    session.endSession();
  }

  const updated = await Student.findById(student._id)
    .populate('userId', 'name phone role avatar isActive')
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .lean();
  return ApiResponse.send(res, 200, { student: formatStudent(updated) }, 'Student updated successfully');
};

// DELETE /api/v1/students/:id - Soft Delete - Admin Only
exports.deleteStudent = async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) return next(new ApiError('Student not found', 404));
  const user = await User.findById(student.userId);
  if (!user || user.isActive === false) return next(new ApiError('Student not found', 404));

  // Soft delete - Deactivate User only, keep Student row for history
  user.isActive = false;
  await user.save();
  return ApiResponse.send(res, 200, null, 'Student deleted successfully');
};
