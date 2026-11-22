const ClassModel = require('./class.model');
const Section = require('../sections/section.model');
const Student = require('../students/student.model');
const SubjectAllocation = require('../subjectAllocations/subjectAllocation.model');
const StudentAttendance = require('../studentAttendance/studentAttendance.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');

// POST /api/v1/classes - Admin Only
exports.createClass = async (req, res, next) => {
  const { name, description } = req.body; // Whitelist
  // No duplicate check - Model index throws 11000 -> errorHandler -> 409
  const classDoc = await ClassModel.create({ name, description });
  return ApiResponse.send(res, 201, { class: classDoc }, 'Class created successfully');
};

// GET /api/v1/classes - All logged-in users
exports.getClasses = async (req, res, next) => {
  // Numeric-aware sort - "1, 2, ... 10" - Without this, "10" comes before "2" (string sort)
  const classes = await ClassModel.find({ isActive: true }).collation({ locale: 'en', numericOrdering: true }).sort({ name: 1 }).lean();
  return ApiResponse.send(res, 200, { classes }, 'Classes fetched successfully');
};

// GET /api/v1/classes/:id
exports.getClassById = async (req, res, next) => {
  const classDoc = await ClassModel.findById(req.params.id).lean();
  if (!classDoc || !classDoc.isActive) {
    return next(new ApiError('Class not found', 404));
  }
  return ApiResponse.send(res, 200, { class: classDoc }, 'Class fetched successfully');
};

// PATCH /api/v1/classes/:id - Admin Only
exports.updateClass = async (req, res, next) => {
  const { name, description } = req.body; // isActive NOT allowed here
  const classDoc = await ClassModel.findOne({ _id: req.params.id, isActive: true });
  if (!classDoc) return next(new ApiError('Class not found', 404));

  if (name !== undefined) classDoc.name = name;
  if (description !== undefined) classDoc.description = description;
  await classDoc.save(); // runValidators via save, duplicate -> 11000 -> 409
  return ApiResponse.send(res, 200, { class: classDoc }, 'Class updated successfully');
};

// DELETE /api/v1/classes/:id - Soft Delete - Admin Only
exports.deleteClass = async (req, res, next) => {
  const classDoc = await ClassModel.findById(req.params.id);
  if (!classDoc || !classDoc.isActive) {
    // Already deleted = 404, not success
    return next(new ApiError('Class not found', 404));
  }

  // USED check - Class in use cannot be deleted, otherwise history breaks
  // 1. Section - Section.classId
  // 2. Student - Student.classId (student is enrolled in this class)
  // 3. SubjectAllocation - Allocation.classId (Assignment is linked via Allocation,
  //    so blocking Allocation also blocks Assignment indirectly)
  // 4. StudentAttendance - Attendance.classId (past attendance history)
  const [usedInSection, usedInStudent, usedInAllocation, usedInAttendance] = await Promise.all([
    Section.findOne({ classId: classDoc._id, isActive: true }).lean(),
    Student.findOne({ classId: classDoc._id }).lean(),
    SubjectAllocation.findOne({ classId: classDoc._id, isActive: true }).lean(),
    StudentAttendance.findOne({ classId: classDoc._id }).lean(),
  ]);

  if (usedInSection || usedInStudent || usedInAllocation || usedInAttendance) {
    return next(new ApiError('Cannot delete class. It is already used in Section, Student, Allocation or Attendance.', 400));
  }

  classDoc.isActive = false;
  await classDoc.save();
  return ApiResponse.send(res, 200, null, 'Class deleted successfully');
};
