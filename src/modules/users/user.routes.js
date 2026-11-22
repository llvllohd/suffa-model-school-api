const express = require('express');
const router = express.Router();

const { getMe, createUser, updatePassword } = require('./user.controller');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');
const { validate } = require('@/middlewares/validate.middleware');
const { createUserSchema, updatePasswordSchema } = require('./user.validator');

// GET /api/v1/users/me - Any logged-in user
router.get('/me', isAuthenticatedUser, asyncHandlerMiddleware(getMe));

// PATCH /api/v1/users/me/password - Any logged-in user
router.patch('/me/password', isAuthenticatedUser, validate(updatePasswordSchema), asyncHandlerMiddleware(updatePassword));

// POST /api/v1/users - Admin only - Create Admin / Teacher / Student
router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createUserSchema), asyncHandlerMiddleware(createUser));

module.exports = router;
