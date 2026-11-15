const express = require('express');
const router = express.Router();

const { createCategory, getCategories, updateCategory, deleteCategory } = require('@/modules/categories/category.controller');
const { createCategorySchema, updateCategorySchema } = require('@/modules/categories/category.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createCategorySchema), asyncHandlerMiddleware(createCategory));

router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), asyncHandlerMiddleware(getCategories));

router.put('/:id', isAuthenticatedUser, authorizeRoles('admin'), validate(updateCategorySchema), asyncHandlerMiddleware(updateCategory));

router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), asyncHandlerMiddleware(deleteCategory));

module.exports = router;
