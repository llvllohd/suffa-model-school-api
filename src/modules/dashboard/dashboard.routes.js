const express = require('express');
const router = express.Router();
const { getAdminDashboard, getTeacherDashboard, getStudentDashboard } = require('./dashboard.controller');
const { getDashboardQuerySchema } = require('./dashboard.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// Admin only
router.get('/admin', isAuthenticatedUser, authorizeRoles('admin'), validate(getDashboardQuerySchema, 'query'), asyncHandlerMiddleware(getAdminDashboard));

// Teacher only - Own data
router.get('/teacher', isAuthenticatedUser, authorizeRoles('teacher'), validate(getDashboardQuerySchema, 'query'), asyncHandlerMiddleware(getTeacherDashboard));

// Student only - Own data
router.get('/student', isAuthenticatedUser, authorizeRoles('student'), validate(getDashboardQuerySchema, 'query'), asyncHandlerMiddleware(getStudentDashboard));

module.exports = router;
