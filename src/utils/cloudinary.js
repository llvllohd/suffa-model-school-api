const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (filePath, folder = 'halls') => {
  return cloudinary.uploader.upload(filePath, {
    folder: `${process.env.CLOUDINARY_FOLDER_NAME}/${folder}`,
    resource_type: 'image',
    transformation: [
      { width: 1920, crop: 'limit' }, // max Full HD, keeps aspect ratio
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
};

const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
};
