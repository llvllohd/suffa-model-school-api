const express = require('express');

const { isAuthenticatedUser } = require('../middlewares/auth');
const { getMe } = require('../controllers/userController');

const router = express.Router();

router.get('/me', isAuthenticatedUser, getMe);

module.exports = router;
