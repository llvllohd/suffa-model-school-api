const Section = require('./section.model');
const ClassModel = require('../classes/class.model');
const Student = require('../students/student.model');
const SubjectAllocation = require('../subjectAllocations/subjectAllocation.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');

// POST /api/v1/sections - Admin Only
exports.createSection = async (req, res, next) => {
  const { classId, name } = req.body; // ✅ Whitelist
  // ✅ Parent must exist + active - Can't create Section for deleted Class
  const classDoc = await ClassModel.findOne({ _id: classId, isActive: true });
  if (!classDoc) return next(new ApiError('Class not found', 404));

  // ✅ No duplicate check - Compound index throws 11000 -> errorHandler -> 409
  const section = await Section.create({ classId, name });
  return ApiResponse.send(res, 201, { section }, 'Section created successfully');
};

// GET /api/v1/sections?classId=xxx - Admin, Teacher
exports.getSections = async (req, res, next) => {
  const filter = { isActive: true };
  if (req.query.classId) {
    filter.classId = req.query.classId;
  }
  const sections = await Section.find(filter).sort({ name: 1 }).lean();
  return ApiResponse.send(res, 200, { sections }, 'Sections fetched successfully');
};

// GET /api/v1/sections/:id
exports.getSectionById = async (req, res, next) => {
  const section = await Section.findById(req.params.id).lean();
  if (!section || !section.isActive) {
    return next(new ApiError('Section not found', 404));
  }
  return ApiResponse.send(res, 200, { section }, 'Section fetched successfully');
};

// PATCH /api/v1/sections/:id - Admin Only
exports.updateSection = async (req, res, next) => {
  const { classId, name } = req.body; // ✅ isActive NOT allowed here
  const section = await Section.findOne({ _id: req.params.id, isActive: true });
  if (!section) return next(new ApiError('Section not found', 404));

  // ✅ FIXED - Only if classId sent + changed
  if (classId && String(section.classId) !== String(classId)) {
    const classDoc = await ClassModel.findOne({ _id: classId, isActive: true });
    if (!classDoc) return next(new ApiError('Class not found', 404));
    section.classId = classId;
  }

  // ✅ Name always comes, always update
  section.name = name;
  await section.save(); // ✅ runValidators via save, duplicate -> 11000 -> 409
  return ApiResponse.send(res, 200, { section }, 'Section updated successfully');
};

// DELETE /api/v1/sections/:id - Soft Delete - Admin Only
exports.deleteSection = async (req, res, next) => {
  const section = await Section.findById(req.params.id);
  if (!section || !section.isActive) {
    // ✅ Already deleted = 404, not success
    return next(new ApiError('Section not found', 404));
  }

  // ✅ USED check - Cannot delete a section that is already used
  // Student: no isActive filter - even inactive student is history of this section
  const usedInStudent = await Student.exists({ sectionId: section._id });
  // Allocation: only active allocations block delete
  const usedInAllocation = await SubjectAllocation.exists({ sectionIds: section._id, isActive: true });
  if (usedInStudent || usedInAllocation) {
    return next(new ApiError('Cannot delete section. It is already used by students or allocations.', 400));
  }

  section.isActive = false;
  await section.save();
  return ApiResponse.send(res, 200, null, 'Section deleted successfully');
};
