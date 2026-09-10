const Joi = require('joi');

const phoneCleaner = (value, helpers) => {
  if (!value) return helpers.error('any.required');
  const cleaned = value
    .replace(/[\s\-+]/g, '')
    .replace(/^91/, '')
    .slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return helpers.error('any.invalid');
  }
  return cleaned;
};

const blockedDateValidator = (value, helpers) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const input = new Date(value);
  input.setHours(0, 0, 0, 0);
  if (input < today) return helpers.error('date.min');
  return value;
};

const addHallValidationSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Hall name is required',
    'any.required': 'Hall name is required',
    'string.min': 'Hall name must be at least 3 characters',
    'string.max': 'Hall name cannot exceed 100 characters',
  }),

  location: Joi.object({
    address: Joi.string().trim().min(5).max(300).required().messages({
      'string.empty': 'Full address is required (e.g., Shamshuddin Circle, Bhatkal)',
      'any.required': 'Full address is required (e.g., Shamshuddin Circle, Bhatkal)',
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address cannot exceed 300 characters',
    }),
    city: Joi.string().valid('Bhatkal', 'Murdeshwar', 'Honavar', 'Kumta').default('Bhatkal').messages({
      'any.only': 'City must be Bhatkal, Murdeshwar, Honavar or Kumta',
    }),
    googleMapLink: Joi.string().uri().allow('', null).messages({
      'string.uri': 'Google Map link must be a valid URL',
    }),
    pincode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .allow('', null)
      .messages({
        'string.pattern.base': 'Pincode must be 6 digits',
      }),
  })
    .required()
    .messages({
      'any.required': 'Location is required',
      'object.base': 'Location is required',
    }),

  capacity: Joi.number().min(50).max(10000).required().messages({
    'number.base': 'Guest capacity is required',
    'any.required': 'Guest capacity is required',
    'number.min': 'Capacity must be at least 50 guests',
    'number.max': 'Capacity cannot be more than 10000 guests',
  }),

  pricePerHour: Joi.number().min(500).required().messages({
    'number.base': 'Per hour price is required for short functions',
    'any.required': 'Per hour price is required for short functions',
    'number.min': 'Per hour price must be at least ₹500',
  }),

  pricePerDay: Joi.number().min(1000).required().greater(Joi.ref('pricePerHour')).messages({
    'number.base': 'Per day price is required for wedding booking',
    'any.required': 'Per day price is required for wedding booking',
    'number.min': 'Per day price must be at least ₹1000',
    'number.greater': 'Per day price must be greater than per hour price',
  }),

  contactPhone: Joi.string().trim().required().custom(phoneCleaner).messages({
    'string.empty': 'Hall owner phone number is required',
    'any.required': 'Hall owner phone number is required',
    'any.invalid': 'Please enter a valid phone number',
  }),

  contactPersonName: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Contact person name is required',
    'any.required': 'Contact person name is required',
    'string.min': 'Name must be at least 2 characters',
  }),

  amenities: Joi.array()
    .items(Joi.string().valid('AC', 'Parking', 'Kitchen', 'Dining Hall', 'Bride Room', 'Sound System', 'Decoration', 'Generator', 'CCTV', 'Lift'))
    .messages({
      'any.only': '{#value} is not a valid amenity',
    }),

  images: Joi.array().items(Joi.string().trim().uri()).min(1).max(10).required().messages({
    'array.min': 'At least 1 image required',
    'array.max': 'Maximum 10 images allowed',
    'any.required': 'At least one hall image is required',
    'string.uri': 'All images must be valid URLs',
  }),

  description: Joi.string().trim().max(1000).allow('', null).messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),

  blockedDates: Joi.array().items(Joi.date().custom(blockedDateValidator)).messages({
    'date.min': 'Blocked date cannot be in the past',
  }),

  isActive: Joi.boolean(),
}).unknown(false);

const updateHallValidationSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional().messages({
    'string.min': 'Hall name must be at least 3 characters',
    'string.max': 'Hall name cannot exceed 100 characters',
  }),

  location: Joi.object({
    address: Joi.string().trim().min(5).max(300).optional().messages({
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address cannot exceed 300 characters',
    }),
    city: Joi.string().valid('Bhatkal', 'Murdeshwar', 'Honavar', 'Kumta').insensitive().optional().messages({
      'any.only': 'City must be Bhatkal, Murdeshwar, Honavar or Kumta',
    }),
    googleMapLink: Joi.string().uri().allow('', null).optional().messages({
      'string.uri': 'Google Map link must be a valid URL',
    }),
    pincode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .allow('', null)
      .optional()
      .messages({
        'string.pattern.base': 'Pincode must be 6 digits',
      }),
  })
    .optional()
    .min(1),

  capacity: Joi.number().min(50).max(10000).optional().messages({
    'number.min': 'Capacity must be at least 50 guests',
    'number.max': 'Capacity cannot be more than 10000 guests',
  }),

  pricePerHour: Joi.number().min(500).optional().messages({
    'number.min': 'Per hour price must be at least ₹500',
  }),

  pricePerDay: Joi.number().min(1000).optional().messages({
    'number.min': 'Per day price must be at least ₹1000',
  }),

  contactPhone: Joi.string().trim().optional().custom(phoneCleaner).messages({
    'any.invalid': 'Please enter a valid phone number',
  }),

  contactPersonName: Joi.string().trim().min(2).max(50).optional().messages({
    'string.min': 'Name must be at least 2 characters',
  }),

  amenities: Joi.array()
    .items(Joi.string().valid('AC', 'Parking', 'Kitchen', 'Dining Hall', 'Bride Room', 'Sound System', 'Decoration', 'Generator', 'CCTV', 'Lift'))
    .optional()
    .messages({
      'any.only': '{#value} is not a valid amenity',
    }),

  description: Joi.string().trim().max(1000).allow('', null).optional().messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),

  blockedDates: Joi.array().items(Joi.date().custom(blockedDateValidator)).optional().messages({
    'date.min': 'Blocked date cannot be in the past',
  }),

  isActive: Joi.boolean().optional(),
})
  .min(1)
  .unknown(false)
  .messages({
    'object.min': 'At least one field is required to update',
    'object.unknown': 'Field {#label} is not allowed to be updated',
  });

const hallQuerySchema = Joi.object({
  city: Joi.string().trim().max(50).lowercase(),
  capacity: Joi.alternatives().try(
    Joi.number().integer().min(1),
    Joi.object({
      gte: Joi.number().integer().min(1),
      lte: Joi.number().integer().min(1),
      gt: Joi.number().integer().min(1),
      lt: Joi.number().integer().min(1),
    }).min(1), // <-- prevents {}
  ),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number()
    .min(0)
    .when('minPrice', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('minPrice')).messages({
        'number.greater': 'maxPrice must be greater than minPrice',
      }),
    }),
  search: Joi.string().trim().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  // Fix sort - allow single or comma separated
  sort: Joi.string()
    .custom((value, helpers) => {
      const allowed = ['pricePerDay', 'capacity', 'createdAt'];
      const fields = value.split(',');
      for (const f of fields) {
        const clean = f.trim().replace(/^-/, '');
        if (!allowed.includes(clean)) {
          return helpers.error('any.invalid');
        }
      }
      return value;
    })
    .default('-createdAt')
    .messages({
      'any.invalid': 'sort must be one of pricePerDay, capacity, createdAt with optional - prefix',
    }),
  isActive: Joi.boolean().truthy('true').falsy('false'),
}).unknown(false);

const publicHallQuerySchema = hallQuerySchema.fork(['isActive'], (s) => s.forbidden());
const adminHallQuerySchema = hallQuerySchema;

const hallIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid hall ID')
    .required(),
});

module.exports = { addHallValidationSchema, updateHallValidationSchema, publicHallQuerySchema, adminHallQuerySchema, hallIdSchema };
