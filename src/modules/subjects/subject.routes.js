const express = require('express');
const router = express.Router();

const { createSubject, getSubjects, getSubjectById, updateSubject, deleteSubject } = require('./subject.controller');
const { createSubjectSchema, updateSubjectSchema, subjectParamsSchema } = require('./subject.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// POST /api/v1/subjects - Admin Only
router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createSubjectSchema), asyncHandlerMiddleware(createSubject));

// GET /api/v1/subjects - Admin, Teacher
router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), asyncHandlerMiddleware(getSubjects));

// GET /api/v1/subjects/:id - Admin, Teacher
router.get('/:id', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), validate(subjectParamsSchema, 'params'), asyncHandlerMiddleware(getSubjectById));

// PATCH /api/v1/subjects/:id - Admin Only
router.patch(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(subjectParamsSchema, 'params'),
  validate(updateSubjectSchema),
  asyncHandlerMiddleware(updateSubject),
);

// DELETE /api/v1/subjects/:id - Admin Only
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), validate(subjectParamsSchema, 'params'), asyncHandlerMiddleware(deleteSubject));

module.exports = router;
