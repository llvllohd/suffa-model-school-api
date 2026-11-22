const express = require('express');
const router = express.Router();

const { getStudents, getStudentById, updateStudent, deleteStudent } = require('./student.controller');
const { updateStudentSchema, studentParamsSchema, studentQuerySchema } = require('./student.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// GET /api/v1/students - Admin, Teacher
// Query validator added - Invalid classId / sectionId now returns 400, not 500
router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), validate(studentQuerySchema, 'query'), asyncHandlerMiddleware(getStudents));

// GET /api/v1/students/:id - Admin, Teacher, Student (Own only)
router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher', 'student'),
  validate(studentParamsSchema, 'params'),
  asyncHandlerMiddleware(getStudentById),
);

// PATCH /api/v1/students/:id - Admin Only
router.patch(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(studentParamsSchema, 'params'),
  validate(updateStudentSchema),
  asyncHandlerMiddleware(updateStudent),
);

// DELETE /api/v1/students/:id - Admin Only
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), validate(studentParamsSchema, 'params'), asyncHandlerMiddleware(deleteStudent));

module.exports = router;
