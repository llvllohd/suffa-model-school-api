const Joi = require('joi');

exports.deleteImageValidationSchema = Joi.object({
  public_id: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9/_-]+$/)
    .min(1)
    .max(200)
    .required()
    .messages({
      'any.required': 'public_id is required',
      'string.empty': 'public_id cannot be empty',
      'string.pattern.base': 'Invalid public_id format',
    }),

  hallId: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'hallId must be a valid ObjectId',
    'string.length': 'hallId must be a valid ObjectId',
  }),

  url: Joi.forbidden(),
  owner: Joi.forbidden(),
  _id: Joi.forbidden(),
}).unknown(false);
