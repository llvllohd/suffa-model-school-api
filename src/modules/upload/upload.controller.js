const fs = require('fs');
const asyncHandlerMiddleware = require('../../middlewares/asyncHandler.middleware');
const ApiError = require('../../utils/apiError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary');
const hallModel = require('../halls/hall.model');
const { MAXIMUM_IMAGE_UPLOADS } = require('./upload.constants');
const checkMagicBytes = require('../../utils/checkMagicBytes');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const cleanupTempFiles = (files) => files.forEach((f) => fs.unlink(f.tempFilePath, () => {}));

// Upload image(s)
exports.uploadImages = asyncHandlerMiddleware(async (req, res, next) => {
  if (!req.files || !req.files.images) return next(new ApiError('No images uploaded', 400));
  let files = req.files.images;
  if (!Array.isArray(files)) files = [files];
  if (files.length > MAXIMUM_IMAGE_UPLOADS) {
    cleanupTempFiles(files);
    return next(new ApiError(`Maximum ${MAXIMUM_IMAGE_UPLOADS} images allowed`, 400));
  }
  const invalid = files.find((f) => !ALLOWED_MIME_TYPES.includes(f.mimetype));
  if (invalid) {
    cleanupTempFiles(files);
    return next(new ApiError('Only JPEG, PNG, WebP and GIF images are allowed', 400));
  }
  const spoofed = files.find((f) => !checkMagicBytes(f.tempFilePath));
  if (spoofed) {
    cleanupTempFiles(files);
    return next(new ApiError('Only JPEG, PNG, WebP and GIF images are allowed', 400));
  }
  const uploads = await Promise.all(
    files.map((file) =>
      uploadToCloudinary(file.tempFilePath).finally(() => fs.unlink(file.tempFilePath, () => {})),
    ),
  );
  const urls = uploads.map((u) => ({
    url: u.secure_url,
    public_id: u.public_id,
  }));
  res.status(200).json({ success: true, urls });
});

// DELETE IMAGE
exports.deleteImage = asyncHandlerMiddleware(async (req, res, next) => {
  const { public_id, hallId } = req.query;

  if (req.user.role !== 'super_admin' && !hallId) {
    return next(new ApiError('hallId is required', 400));
  }

  if (hallId) {
    const hallFilter = { _id: hallId };
    if (req.user.role !== 'super_admin') hallFilter.owner = req.user._id;

    const updated = await hallModel.findOneAndUpdate(hallFilter, { $pull: { images: { public_id } } });
    if (!updated) return next(new ApiError('Hall not found or not authorized', 404));
  }

  const result = await deleteFromCloudinary(public_id);

  if (result.result === 'not found') {
    return next(new ApiError('Image not found on Cloudinary', 404));
  }

  if (result.result !== 'ok') {
    return next(new ApiError('Failed to delete image from Cloudinary', 500));
  }

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    result: result.result,
  });
});
