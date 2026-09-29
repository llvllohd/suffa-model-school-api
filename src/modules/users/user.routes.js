const express = require('express');
const router = express.Router();

const { getMe } = require('./user.controller');
const { isAuthenticatedUser } = require('../../middlewares/auth.middleware');
const asyncHandlerMiddleware = require('../../middlewares/asyncHandler.middleware');

router.get('/me', isAuthenticatedUser, asyncHandlerMiddleware(getMe));

module.exports = router;
