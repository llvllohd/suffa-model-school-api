const express = require('express');
const router = express.Router();

const { getMe } = require('./userController');
const { isAuthenticatedUser } = require('../../middlewares/authMiddleware');
const asyncHandlerMiddleware = require('../../middlewares/asyncHandlerMiddleware');

router.get('/me', isAuthenticatedUser, asyncHandlerMiddleware(getMe));

module.exports = router;
