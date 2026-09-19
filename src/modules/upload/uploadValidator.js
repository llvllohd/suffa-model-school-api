const Joi = require('joi');

exports.deleteImageValidationSchema = Joi.object({
  public_id: Joi.string().trim().min(1).required().messages({
    'any.required': 'public_id is required',
    'string.empty': 'public_id cannot be empty',
  }),
  url: Joi.string().uri().allow('', null).optional().messages({
    'string.uri': 'url must be a valid URL',
  }),
  hallId: Joi.string()
    .trim()
    .allow('', null)
    .optional()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'hallId must be a valid ObjectId',
    }),
});
