const Joi = require("joi");

exports.updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': 'Old password is required',
    'string.empty': 'Old password is required',
  }),
  newPassword: Joi.string().min(8).max(128).required().disallow(Joi.ref('oldPassword')).messages({
    'any.required': 'New password is required',
    'string.empty': 'New password is required',
    'string.min': 'Password should have at least 8 characters',
    'string.max': 'Password must be less than 128 characters',
    'any.invalid': 'New password cannot be same as old password',
  }),
  confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
    'any.required': 'Confirm password is required',
    'string.empty': 'Confirm password is required',
    'any.only': 'Passwords do not match',
  }),
});
