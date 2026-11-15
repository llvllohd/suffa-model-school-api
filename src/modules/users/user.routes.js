const express = require('express');
const router = express.Router();

const { getMe, createUser } = require('./user.controller');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');
const { validate } = require('@/middlewares/validate.middleware');
const { createUserSchema } = require('./user.validator');

// GET /api/v1/users/me - Any logged-in user
router.get('/me', isAuthenticatedUser, asyncHandlerMiddleware(getMe));

// POST /api/v1/users - Admin only - Create Admin / Teacher / Student
router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createUserSchema), asyncHandlerMiddleware(createUser));

module.exports = router;
