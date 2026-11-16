const ClassModel = require('./class.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');

// POST /api/v1/classes - Admin Only
exports.createClass = async (req, res, next) => {
  const { name, description } = req.body; // ✅ Whitelist
  // ✅ No duplicate check - Model index throws 11000 -> errorHandler -> 409
  const classDoc = await ClassModel.create({ name, description });
  return ApiResponse.send(res, 201, { class: classDoc }, 'Class created successfully');
};

// GET /api/v1/classes - All logged-in users
exports.getClasses = async (req, res, next) => {
  const classes = await ClassModel.find({ isActive: true }).sort({ name: 1 }).lean();
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

// PUT /api/v1/classes/:id - Admin Only
exports.updateClass = async (req, res, next) => {
  const { name, description } = req.body; // ✅ isActive NOT allowed here
  const classDoc = await ClassModel.findOne({ _id: req.params.id, isActive: true });
  if (!classDoc) return next(new ApiError('Class not found', 404));

  classDoc.name = name;
  // ✅ Only overwrite description if sent - So PUT without description doesn't wipe it
  if (description !== undefined) classDoc.description = description;
  await classDoc.save(); // ✅ runValidators via save, duplicate -> 11000 -> 409
  return ApiResponse.send(res, 200, { class: classDoc }, 'Class updated successfully');
};

// DELETE /api/v1/classes/:id - Soft Delete - Admin Only
exports.deleteClass = async (req, res, next) => {
  const classDoc = await ClassModel.findById(req.params.id);
  if (!classDoc || !classDoc.isActive) {
    // ✅ Already deleted = 404, not success
    return next(new ApiError('Class not found', 404));
  }

  // USED check - Add when Section / Student / Assignment exist
  // const usedInSection = await Section.findOne({ classId: classDoc._id, isActive: true });
  // const usedInStudent = await User.findOne({ classId: classDoc._id, isActive: true, role: 'student' });
  // const usedInAssignment = await SubjectAssignment.findOne({ classId: classDoc._id });
  // if (usedInSection || usedInStudent || usedInAssignment) {
  //   return next(new ApiError('Cannot delete. It is already used. Deactivate it instead.', 400));
  // }

  classDoc.isActive = false;
  await classDoc.save();
  return ApiResponse.send(res, 200, null, 'Class deleted successfully');
};
