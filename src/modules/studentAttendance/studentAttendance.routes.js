const express = require('express');
const router = express.Router();
const {
  upsertStudentAttendance,
  getStudentAttendance,
  getStudentAttendanceById,
  getMyAttendance,
  getAttendanceSummary,
} = require('./studentAttendance.controller');
const {
  upsertStudentAttendanceSchema,
  getStudentAttendanceQuerySchema,
  getMyAttendanceQuerySchema,
  getAttendanceSummaryQuerySchema,
  studentAttendanceParamsSchema,
} = require('./studentAttendance.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// IMPORTANT: /my and /summary must be defined before /:id - otherwise Express will treat /my as /:id
router.get('/my', isAuthenticatedUser, authorizeRoles('student'), validate(getMyAttendanceQuerySchema, 'query'), asyncHandlerMiddleware(getMyAttendance));

router.get(
  '/summary',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher', 'student'),
  validate(getAttendanceSummaryQuerySchema, 'query'),
  asyncHandlerMiddleware(getAttendanceSummary),
);

// Teacher only - Take Attendance - Admin cannot take student attendance
router.post(
  '/',
  isAuthenticatedUser,
  authorizeRoles('teacher'),
  validate(upsertStudentAttendanceSchema, 'body'),
  asyncHandlerMiddleware(upsertStudentAttendance),
);

// Admin + Teacher - View list
router.get(
  '/',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(getStudentAttendanceQuerySchema, 'query'),
  asyncHandlerMiddleware(getStudentAttendance),
);

router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(studentAttendanceParamsSchema, 'params'),
  asyncHandlerMiddleware(getStudentAttendanceById),
);

module.exports = router;
