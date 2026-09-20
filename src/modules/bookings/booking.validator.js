const Joi = require('joi');

const createBookingSchema = Joi.object({
  hall: Joi.string().hex().length(24).required().messages({
    'string.empty': 'Hall selection is required',
    'any.required': 'Hall selection is required',
    'string.hex': 'Please select a valid hall',
    'string.length': 'Please select a valid hall',
  }),

  startDate: Joi.date()
    .iso()
    .required()
    .custom((val, helpers) => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const d = new Date(val);
      d.setUTCHours(0, 0, 0, 0);
      if (d < today) return helpers.message('Start date cannot be in the past');
      return val;
    })
    .messages({
      'any.required': 'Start date is required',
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in YYYY-MM-DD format',
    }),

  endDate: Joi.date()
    .iso()
    .optional()
    .allow(null, '')
    .custom((val, helpers) => {
      if (!val) return val;
      const { startDate } = helpers.state.ancestors[0];
      if (startDate && new Date(val) < new Date(startDate)) {
        return helpers.message('End date cannot be before start date');
      }
      return val;
    })
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in YYYY-MM-DD format',
    }),

  type: Joi.string().valid('booked', 'blocked').required().messages({
    'any.required': 'Booking type is required',
    'any.only': 'Type must be either booked or blocked',
    'string.base': 'Booking type must be text',
  }),

  customerName: Joi.when('type', {
    is: 'booked',
    then: Joi.string().trim().min(2).max(50).required().messages({
      'any.required': 'Customer name is required for booked',
      'string.empty': 'Customer name cannot be empty',
      'string.min': 'Customer name must be at least 2 characters',
      'string.max': 'Customer name cannot exceed 50 characters',
    }),
    otherwise: Joi.forbidden().messages({
      'any.unknown': 'Customer name should not be provided when blocked',
    }),
  }),

  customerPhone: Joi.when('type', {
    is: 'booked',
    then: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        'any.required': 'Customer phone is required for booked',
        'string.empty': 'Customer phone cannot be empty',
        'string.pattern.base': 'Enter valid 10-digit mobile number starting with 6-9',
      }),
    otherwise: Joi.forbidden().messages({
      'any.unknown': 'Customer phone should not be provided when blocked',
    }),
  }),

  advance: Joi.when('type', {
    is: 'booked',
    then: Joi.number().min(0).max(1000000).optional().messages({
      'number.base': 'Advance must be a number',
      'number.min': 'Advance cannot be negative',
      'number.max': 'Advance cannot exceed ₹10,00,000',
    }),
    otherwise: Joi.forbidden().messages({
      'any.unknown': 'Advance should not be provided when blocked',
    }),
  }),

  notes: Joi.string().trim().max(300).optional().allow('', null).messages({
    'string.max': 'Notes cannot exceed 300 characters',
  }),
});

const updateBookingSchema = Joi.object({
  hall: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Please select a valid hall',
    'string.length': 'Please select a valid hall',
  }),

  startDate: Joi.date()
    .iso()
    .optional()
    .custom((val, helpers) => {
      if (!val) return val;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const d = new Date(val);
      d.setUTCHours(0, 0, 0, 0);
      if (d < today) return helpers.message('Start date cannot be in the past');
      return val;
    })
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in YYYY-MM-DD format',
    }),

  endDate: Joi.date()
    .iso()
    .optional()
    .allow(null, '')
    .custom((val, helpers) => {
      if (!val) return val;
      const { startDate } = helpers.state.ancestors[0];
      if (startDate && new Date(val) < new Date(startDate)) {
        return helpers.message('End date cannot be before start date');
      }
      return val;
    })
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in YYYY-MM-DD format',
    }),

  type: Joi.string().valid('booked', 'blocked').optional().messages({
    'any.only': 'Type must be either booked or blocked',
    'string.base': 'Booking type must be text',
  }),

  customerName: Joi.when('type', {
    is: 'booked',
    then: Joi.string().trim().min(2).max(50).optional().messages({
      'string.min': 'Customer name must be at least 2 characters',
      'string.max': 'Customer name cannot exceed 50 characters',
    }),
    otherwise: Joi.string().trim().min(2).max(50).optional().allow('', null),
  }),

  customerPhone: Joi.when('type', {
    is: 'booked',
    then: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Enter valid 10-digit mobile number starting with 6-9',
      }),
    otherwise: Joi.string().trim().optional().allow('', null),
  }),

  advance: Joi.when('type', {
    is: 'booked',
    then: Joi.number().min(0).max(1000000).optional().allow(null).messages({
      'number.base': 'Advance must be a number',
      'number.min': 'Advance cannot be negative',
      'number.max': 'Advance cannot exceed ₹10,00,000',
    }),
    otherwise: Joi.number().optional().allow(null, ''),
  }),

  notes: Joi.string().trim().max(300).optional().allow('', null).messages({
    'string.max': 'Notes cannot exceed 300 characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required to update',
  });

const bookingIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.empty': 'Invalid ID format',
    'string.hex': 'Invalid ID format',
    'string.length': 'Invalid ID format',
  }),
});

const hallIdSchema = Joi.object({
  hallId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'Invalid ID format',
    'string.hex': 'Invalid ID format',
    'string.length': 'Invalid ID format',
  }),
});

const hallQuerySchema = Joi.object({
  id: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Invalid ID format',
    'string.length': 'Invalid ID format',
  }),
});

const availabilityQuerySchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'month must be YYYY-MM' }),
});

module.exports = { createBookingSchema, updateBookingSchema, bookingIdSchema, hallIdSchema, hallQuerySchema, availabilityQuerySchema };
