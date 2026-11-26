const express = require('express');
const router = express.Router();

const { getTeachers, getTeacherById, updateTeacher, deleteTeacher } = require('./teacher.controller');
const { updateTeacherSchema, teacherParamsSchema } = require('./teacher.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// GET /api/v1/teachers - Admin, Teacher (teachers need the list to share an assignment with a colleague)
router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), asyncHandlerMiddleware(getTeachers));

// GET /api/v1/teachers/:id - Admin, Teacher
router.get('/:id', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), validate(teacherParamsSchema, 'params'), asyncHandlerMiddleware(getTeacherById));

// PATCH /api/v1/teachers/:id - Admin Only
router.patch(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(teacherParamsSchema, 'params'),
  validate(updateTeacherSchema),
  asyncHandlerMiddleware(updateTeacher),
);

// DELETE /api/v1/teachers/:id - Admin Only
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), validate(teacherParamsSchema, 'params'), asyncHandlerMiddleware(deleteTeacher));

module.exports = router;
