const asyncHandlerMiddleware = require('../../middlewares/asyncHandlerMiddleware');
const ApiError = require('../../utils/apiError');
const { uploadToCloudinary } = require('../../utils/cloudinary');
const { MAXIMUM_IMAGE_UPLOADS } = require('./uploadConstants');

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
