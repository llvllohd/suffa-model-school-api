const Category = require('./category.model');
const ApiError = require('@/utils/apiError');

// POST /api/categories - Admin Only
exports.createCategory = async (req, res, next) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: category });
};

// GET /api/categories
exports.getCategories = async (req, res, next) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: categories });
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return next(new ApiError('Category not found', 404));
  res.json({ success: true, data: category });
};

// DELETE /api/categories/:id - Soft Delete - Section 5A
exports.deleteCategory = async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new ApiError('Category not found', 404));

  // USED check - Block if used anywhere - Add when Subjects / Assignments / Marks exist
  // const usedInSubject = await Subject.findOne({ 'defaultCategories.categoryId': category._id });
  // const usedInAssignment = await SubjectAssignment.findOne({ 'categoriesOverride.categoryId': category._id });
  // const usedInMarks = await MarkSheet.findOne({ 'marks.categoryId': category._id });
  // if (usedInSubject || usedInAssignment || usedInMarks) {
  //   return next(new ApiError('Cannot delete. It is already used. Deactivate it instead.', 400));
  // }

  category.isActive = false;
  await category.save();
  res.json({ success: true, message: 'Category deleted' });
};
