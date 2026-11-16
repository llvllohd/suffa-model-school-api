const Category = require('./category.model');
const ApiError = require('@/utils/apiError');
const ApiResponse = require('@/utils/apiResponse');

// POST /api/v1/categories - Admin Only
exports.createCategory = async (req, res, next) => {
  const { name } = req.body; // ✅ Whitelist - Model has only name + isActive
  // ✅ No duplicate check - Model index throws 11000 -> errorHandler -> 409
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

// PUT /api/v1/categories/:id - Admin Only
exports.updateCategory = async (req, res, next) => {
  const { name } = req.body; // ✅ isActive NOT allowed here
  const category = await Category.findOne({ _id: req.params.id, isActive: true });
  if (!category) return next(new ApiError('Category not found', 404));

  category.name = name;
  await category.save(); // ✅ runValidators via save, duplicate -> 11000 -> 409
  return ApiResponse.send(res, 200, { category }, 'Category updated successfully');
};

// DELETE /api/v1/categories/:id - Soft Delete - Admin Only
exports.deleteCategory = async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category || !category.isActive) {
    // ✅ Already deleted = 404, not success
    return next(new ApiError('Category not found', 404));
  }

  // USED check - Add when Subjects / Assignments / Marks exist
  // const usedInSubject = await Subject.findOne({ 'defaultCategories.categoryId': category._id });
  // const usedInAssignment = await SubjectAssignment.findOne({ 'categoriesOverride.categoryId': category._id });
  // const usedInMarks = await MarkSheet.findOne({ 'marks.categoryId': category._id });
  // if (usedInSubject || usedInAssignment || usedInMarks) {
  //   return next(new ApiError('Cannot delete. It is already used. Deactivate it instead.', 400));
  // }

  category.isActive = false;
  await category.save();
  return ApiResponse.send(res, 200, null, 'Category deleted successfully');
};
