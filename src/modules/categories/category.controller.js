const Category = require('./category.model');
const Subject = require('../subjects/subject.model');
const SubjectAssignment = require('../subjectAssignments/subjectAssignment.model');
const MarkSheet = require('../markSheets/markSheet.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');

// POST /api/v1/categories - Admin Only
exports.createCategory = async (req, res, next) => {
  const { name } = req.body; // Whitelist - Model has only name + isActive
  // No duplicate check - Model index throws 11000 -> errorHandler -> 409
  const category = await Category.create({ name });
  return ApiResponse.send(res, 201, { category }, 'Category created successfully');
};

// GET /api/v1/categories - All logged-in users
exports.getCategories = async (req, res, next) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  return ApiResponse.send(res, 200, { categories }, 'Categories fetched successfully');
};

// GET /api/v1/categories/:id
exports.getCategoryById = async (req, res, next) => {
  const category = await Category.findById(req.params.id).lean();
  if (!category || !category.isActive) {
    return next(new ApiError('Category not found', 404));
  }
  return ApiResponse.send(res, 200, { category }, 'Category fetched successfully');
};

// PATCH /api/v1/categories/:id - Admin Only
exports.updateCategory = async (req, res, next) => {
  const { name } = req.body; // isActive NOT allowed here
  const category = await Category.findOne({ _id: req.params.id, isActive: true });
  if (!category) return next(new ApiError('Category not found', 404));

  category.name = name;
  await category.save(); // runValidators via save, duplicate -> 11000 -> 409
  return ApiResponse.send(res, 200, { category }, 'Category updated successfully');
};

// DELETE /api/v1/categories/:id - Soft Delete - Admin Only
exports.deleteCategory = async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category || !category.isActive) {
    // Already deleted = 404, not success
    return next(new ApiError('Category not found', 404));
  }

  // USED check - Category in use cannot be deleted, otherwise history breaks
  // 1. Subject defaults - Subject.defaultCategories.categoryId
  //    Assignment effectiveCategories are derived from Subject defaults,
  //    so deleting a default category would corrupt past Assignments too.
  // 2. Assignment overrides / removed - categoriesOverride.categoryId, removedCategoryIds
  // 3. MarkSheet - marks.categoryId (entered marks reference this category)
  const [usedInSubject, usedInAssignment, usedInMarkSheet] = await Promise.all([
    Subject.findOne({ 'defaultCategories.categoryId': category._id, isActive: true }).lean(),
    SubjectAssignment.findOne({
      isActive: true,
      $or: [{ 'categoriesOverride.categoryId': category._id }, { removedCategoryIds: category._id }],
    }).lean(),
    MarkSheet.findOne({ 'marks.categoryId': category._id }).lean(),
  ]);

  if (usedInSubject || usedInAssignment || usedInMarkSheet) {
    return next(new ApiError('Cannot delete category. It is already used in Subject, Assignment or MarkSheet.', 400));
  }

  category.isActive = false;
  await category.save();
  return ApiResponse.send(res, 200, null, 'Category deleted successfully');
};
