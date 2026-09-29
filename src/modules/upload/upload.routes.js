const express = require('express');
const router = express.Router();

const { uploadImages, deleteImage } = require('./upload.controller');
const { isAuthenticatedUser, authorizedRole } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { deleteImageValidationSchema } = require('./upload.validator');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin'));

router.post('/images', uploadImages);
router.delete('/images', validate(deleteImageValidationSchema, 'query'), deleteImage);

module.exports = router;
