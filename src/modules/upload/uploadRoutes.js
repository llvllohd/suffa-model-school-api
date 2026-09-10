const express = require('express');
const router = express.Router();

const { uploadImages } = require('./uploadController');
const { isAuthenticatedUser, authorizedRole } = require('../../middlewares/authMiddleware');

router.use(isAuthenticatedUser, authorizedRole('admin'));

router.post('/images', uploadImages);

module.exports = router;
