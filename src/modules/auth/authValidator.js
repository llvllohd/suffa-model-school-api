const Joi = require('joi');

exports.registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'any.required': 'Name is required',
    'string.empty': 'Name is required',
    'string.min': 'Name must be atleast 2 characters',
    'string.max': 'Name cannot exceed 50 characters',
  }),

  email: Joi.string().trim().lowercase().email().required().messages({
    'any.required': 'Email is required',
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email',
  }),

  phone: Joi.string()
    .trim()
    .allow('', null)
    .optional()
    .custom((value, helpers) => {
      if (!value) return value;
      const cleaned = value
        .replace(/[\s\-+]/g, '')
        .replace(/^91/, '')
        .slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        return helpers.error('any.invalid');
      }
      return cleaned; // always save as 10-digit
    })
    .messages({
      'any.invalid': 'Please enter a valid phone number',
    }),

  password: Joi.string().min(8).max(128).required().messages({
    'any.required': 'Please enter your password',
    'string.empty': 'Please enter your password',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be less than 128 characters',
  }),

  // Don't allow client to set these on register
  role: Joi.forbidden(),
  sourceType: Joi.forbidden(),
  googleId: Joi.forbidden(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'any.required': 'Invalid email or password',
    'string.empty': 'Invalid email or password',
    'string.email': 'Invalid email or password',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Invalid email or password',
    'string.empty': 'Invalid email or password',
  }),
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'any.required': 'Invalid email',
    'string.empty': 'Invalid email',
    'string.email': 'Invalid email',
  }),
  url: Joi.string().uri().required().messages({
    'any.required': 'Invalid URL',
    'string.empty': 'Invalid URL',
    'string.uri': 'Invalid URL',
  }),
});

exports.resetPasswordParamsSchema = Joi.object({
  token: Joi.string().trim().hex().length(64).required().messages({
    'any.required': 'Invalid token',
    'string.empty': 'Invalid token',
    'string.hex': 'Invalid token',
    'string.length': 'Invalid token',
  }),
});

exports.resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(128).required().messages({
    'any.required': 'Invalid password',
    'string.empty': 'Invalid password',
    'string.min': 'Password should have at least 8 characters',
    'string.max': 'Password must be less than 128 characters',
  }),
  confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.required': 'Passwords do not match',
    'string.empty': 'Passwords do not match',
    'any.only': 'Passwords do not match',
  }),
});

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
