const asyncHandlerMiddleware = require('../../middlewares/asyncHandlerMiddleware');
const ApiError = require('../../utils/apiError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary');
const hallModel = require('../halls/hall.model');
const { MAXIMUM_IMAGE_UPLOADS } = require('./uploadConstants');

// Upload image(s)
exports.uploadImages = asyncHandlerMiddleware(async (req, res, next) => {
  if (!req.files || !req.files.images) return next(new ApiError('No images uploaded', 400));
  let files = req.files.images;
  if (!Array.isArray(files)) files = [files];
  if (files.length > MAXIMUM_IMAGE_UPLOADS) {
    return next(new ApiError(`Maximum ${MAXIMUM_IMAGE_UPLOADS} images allowed`, 400));
  }
  const uploads = await Promise.all(files.map((file) => uploadToCloudinary(file.tempFilePath)));
  const urls = uploads.map((u) => ({
    url: u.secure_url,
    public_id: u.public_id, // keep this for delete
  }));
  res.status(200).json({ success: true, urls });
});

// DELETE IMAGE
exports.deleteImage = asyncHandlerMiddleware(async (req, res, next) => {
  const { public_id, hallId } = req.query;

  // Delete from Cloudinary
  const result = await deleteFromCloudinary(public_id);

  if (result.result === 'not found') {
    return next(new ApiError('Image not found on Cloudinary', 404));
  }

  if (result.result !== 'ok') {
    return next(new ApiError('Failed to delete image from Cloudinary', 500));
  }

  // If hallId provided, pull from hall document too
  if (hallId) {
    await hallModel.findByIdAndUpdate(hallId, {
      $pull: { images: { public_id: public_id } },
    });
  }

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    result: result.result,
  });
});
