const express = require('express');
const router = express.Router();
const {
  upsertTeacherAttendance,
  getTeacherAttendance,
  getTeacherAttendanceById,
  getMyTeacherAttendance,
  getTeacherAttendanceSummary,
} = require('./teacherAttendance.controller');
const {
  upsertTeacherAttendanceSchema,
  getTeacherAttendanceQuerySchema,
  getMyTeacherAttendanceQuerySchema,
  getTeacherAttendanceSummaryQuerySchema,
  teacherAttendanceParamsSchema,
} = require('./teacherAttendance.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// IMPORTANT: /my and /summary must be defined before /:id
router.get(
  '/my',
  isAuthenticatedUser,
  authorizeRoles('teacher'),
  validate(getMyTeacherAttendanceQuerySchema, 'query'),
  asyncHandlerMiddleware(getMyTeacherAttendance),
);

router.get(
  '/summary',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(getTeacherAttendanceSummaryQuerySchema, 'query'),
  asyncHandlerMiddleware(getTeacherAttendanceSummary),
);

// Admin only - Take Attendance
router.post(
  '/',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(upsertTeacherAttendanceSchema, 'body'),
  asyncHandlerMiddleware(upsertTeacherAttendance),
);

// Admin only - View list
router.get('/', isAuthenticatedUser, authorizeRoles('admin'), validate(getTeacherAttendanceQuerySchema, 'query'), asyncHandlerMiddleware(getTeacherAttendance));

router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(teacherAttendanceParamsSchema, 'params'),
  asyncHandlerMiddleware(getTeacherAttendanceById),
);

module.exports = router;
