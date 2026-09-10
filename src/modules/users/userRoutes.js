const express = require('express');
const router = express.Router();

const { isAuthenticatedUser } = require('../../middlewares/auth');
const { getMe } = require('./userController');

router.get('/me', isAuthenticatedUser, getMe);

module.exports = router;
