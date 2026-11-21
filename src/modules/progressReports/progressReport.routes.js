const express = require('express');
const router = express.Router();
const { getProgressReport, getClassProgressReports } = require('./progressReport.controller');
const { getProgressReportQuerySchema, getClassProgressReportQuerySchema } = require('./progressReport.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// IMPORTANT: /class must be defined before / - otherwise Express will treat /class as the / route
router.get(
  '/class',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(getClassProgressReportQuerySchema, 'query'),
  asyncHandlerMiddleware(getClassProgressReports),
);

router.get(
  '/',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher', 'student'),
  validate(getProgressReportQuerySchema, 'query'),
  asyncHandlerMiddleware(getProgressReport),
);

module.exports = router;
