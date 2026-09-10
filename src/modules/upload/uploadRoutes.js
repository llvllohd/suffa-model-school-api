const express = require('express');
const router = express.Router();

const { uploadImages, deleteImage } = require('./uploadController');
const { isAuthenticatedUser, authorizedRole } = require('../../middlewares/authMiddleware');
const { validate } = require('../../middlewares/validateMiddleware');
const { deleteImageValidationSchema } = require('./uploadValidator');

router.use(isAuthenticatedUser, authorizedRole('admin'));

router.post('/images', uploadImages);
router.delete('/images', validate(deleteImageValidationSchema, 'query'), deleteImage);

module.exports = router;
