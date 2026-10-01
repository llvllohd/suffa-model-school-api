const ApiError = require('../../../utils/apiError');
const Category = require('./category.model');

const createCategory = async (req, res, next) => {
  const { name, icon, color } = req.body;
  const exists = await Category.findOne({
    owner: req.user._id,
    name: name.trim().toLowerCase(),
  });
  if (exists) return next(new ApiError('Category already exists', 409));
  const category = await Category.create({
    name,
    icon,
    color,
    owner: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Category created', data: category });
};

const getCategories = async (req, res) => {
  const filter = { owner: req.user._id };
  const categories = await Category.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: categories });
};
const updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const category = await Category.findOneAndUpdate({ _id: id, owner: req.user._id }, req.body, { new: true, runValidators: true });
  if (!category) return next(new ApiError('Category not found', 404));
  res.status(200).json({ success: true, message: 'Category updated', data: category });
};

const deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  const deleted = await Category.findOneAndDelete({ _id: id, owner: req.user._id });
  if (!deleted) return next(new ApiError('Category not found', 404));
  res.status(200).json({ success: true, message: 'Category deleted' });
};

module.exports = { createCategory, getCategories, updateCategory, deleteCategory };
