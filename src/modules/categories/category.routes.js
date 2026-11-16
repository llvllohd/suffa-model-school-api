const express = require('express');
const router = express.Router();

const { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory } = require('./category.controller');
const { createCategorySchema, updateCategorySchema, categoryParamsSchema } = require('./category.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// POST /api/v1/categories - Admin Only
router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createCategorySchema), asyncHandlerMiddleware(createCategory));

// GET /api/v1/categories - Admin, Teacher
router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), asyncHandlerMiddleware(getCategories));

// GET /api/v1/categories/:id - Admin, Teacher
router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(categoryParamsSchema, 'params'),
  asyncHandlerMiddleware(getCategoryById),
);

// PUT /api/v1/categories/:id - Admin Only
router.put(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(categoryParamsSchema, 'params'),
  validate(updateCategorySchema),
  asyncHandlerMiddleware(updateCategory),
);

// DELETE /api/v1/categories/:id - Admin Only
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), validate(categoryParamsSchema, 'params'), asyncHandlerMiddleware(deleteCategory));

module.exports = router;
