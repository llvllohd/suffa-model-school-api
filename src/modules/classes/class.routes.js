const express = require('express');
const router = express.Router();

const { createClass, getClasses, getClassById, updateClass, deleteClass } = require('./class.controller');
const { createClassSchema, updateClassSchema, classParamsSchema } = require('./class.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// POST /api/v1/classes - Admin Only
router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createClassSchema), asyncHandlerMiddleware(createClass));

// GET /api/v1/classes - Admin, Teacher
router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), asyncHandlerMiddleware(getClasses));

// GET /api/v1/classes/:id - Admin, Teacher
router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(classParamsSchema, 'params'),
  asyncHandlerMiddleware(getClassById),
);

// PUT /api/v1/classes/:id - Admin Only
router.put(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(classParamsSchema, 'params'),
  validate(updateClassSchema),
  asyncHandlerMiddleware(updateClass),
);

// DELETE /api/v1/classes/:id - Admin Only
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), validate(classParamsSchema, 'params'), asyncHandlerMiddleware(deleteClass));

module.exports = router;
