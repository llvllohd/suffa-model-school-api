const express = require('express');

const { isAuthenticatedUser } = require('../middlewares/auth');
const { getMe, updatePassword } = require('../controllers/userController');
const { updatePasswordSchema } = require('../validators/userValidator');
const decryptPasswordMiddleware = require('../middlewares/decryptPasswordMiddleware');
const { validate } = require('../middlewares/validate');

const router = express.Router();

router.get('/me', isAuthenticatedUser, getMe);
router.put('/password/update', isAuthenticatedUser, decryptPasswordMiddleware, validate(updatePasswordSchema), updatePassword);

module.exports = router;
