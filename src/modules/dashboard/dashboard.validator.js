const Joi = require('joi');

const dashboardQuerySchema = Joi.object({
  hall: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid hall ID',
    'string.length': 'Invalid hall ID',
    'any.required': 'Hall ID is required',
    'string.empty': 'Hall ID is required',
  }),
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Month must be YYYY-MM',
      'any.required': 'Month is required',
      'string.empty': 'Month is required',
    }),
}).unknown(false);

module.exports = {
  dashboardQuerySchema,
};
