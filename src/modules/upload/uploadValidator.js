const Joi = require('joi');

exports.deleteImageValidationSchema = Joi.object({
  public_id: Joi.string().trim().min(1).invalid('""', "''").required().messages({
    'any.required': 'public_id is required',
    'string.empty': 'public_id cannot be empty',
    'string.min': 'public_id cannot be empty',
    'any.invalid': 'public_id cannot be empty',
  }),
});
