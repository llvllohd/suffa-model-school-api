const express = require('express');
const router = express.Router();

const { createSection, getSections, getSectionById, updateSection, deleteSection } = require('./section.controller');
const { createSectionSchema, updateSectionSchema, sectionParamsSchema, sectionQuerySchema } = require('./section.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// POST /api/v1/sections - Admin Only
router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createSectionSchema), asyncHandlerMiddleware(createSection));

// GET /api/v1/sections - Admin, Teacher
router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), validate(sectionQuerySchema, 'query'), asyncHandlerMiddleware(getSections));

// GET /api/v1/sections/:id - Admin, Teacher
router.get('/:id', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), validate(sectionParamsSchema, 'params'), asyncHandlerMiddleware(getSectionById));

// PATCH /api/v1/sections/:id - Admin Only
router.patch(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(sectionParamsSchema, 'params'),
  validate(updateSectionSchema),
  asyncHandlerMiddleware(updateSection),
);

// DELETE /api/v1/sections/:id - Admin Only
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), validate(sectionParamsSchema, 'params'), asyncHandlerMiddleware(deleteSection));

module.exports = router;
