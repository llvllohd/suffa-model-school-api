const express = require('express');
const router = express.Router();
const { bulkUpsertMarkSheets, getMarkSheets, getMarkSheetById } = require('./markSheet.controller');
const { bulkUpsertMarkSheetSchema, getMarkSheetsQuerySchema, markSheetParamsSchema } = require('./markSheet.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// Teacher only - Fill Marks - Admin cannot fill
router.post('/bulk', isAuthenticatedUser, authorizeRoles('teacher'), validate(bulkUpsertMarkSheetSchema), asyncHandlerMiddleware(bulkUpsertMarkSheets));

// Admin + Teacher + Student - View with role filters in controller
router.get(
  '/',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher', 'student'),
  validate(getMarkSheetsQuerySchema, 'query'),
  asyncHandlerMiddleware(getMarkSheets),
);
router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher', 'student'),
  validate(markSheetParamsSchema, 'params'),
  asyncHandlerMiddleware(getMarkSheetById),
);

module.exports = router;
