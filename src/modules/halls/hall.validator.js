const Joi = require('joi');
const { ALLOWED_SORT } = require('./hall.constants');
const { MAXIMUM_IMAGE_UPLOADS } = require('../upload/uploadConstants');

const phoneCleaner = (value, helpers) => {
  if (!value) return helpers.error('any.required');
  const cleaned = value
    .replace(/[\s\-+]/g, '')
    .replace(/^91/, '')
    .slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleaned)) return helpers.error('any.invalid');
  return cleaned;
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
      'any.required': 'Full address is required',
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address cannot exceed 300 characters',
    }),
    city: Joi.string()
      .valid('Bhatkal', 'Murdeshwar', 'Honavar', 'Kumta')
      .default('Bhatkal')
      .messages({ 'any.only': 'City must be Bhatkal, Murdeshwar, Honavar or Kumta' }),
    googleMapLink: Joi.string().uri().allow('', null).messages({ 'string.uri': 'Google Map link must be a valid URL' }),
    pincode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .allow('', null)
      .messages({ 'string.pattern.base': 'Pincode must be 6 digits' }),
  })
    .required()
    .unknown(false)
    .messages({ 'any.required': 'Location is required', 'object.base': 'Location is required' }),
  capacity: Joi.number().min(50).max(10000).required().messages({
    'number.base': 'Guest capacity is required',
    'any.required': 'Guest capacity is required',
    'number.min': 'Capacity must be at least 50 guests',
    'number.max': 'Capacity cannot be more than 10000 guests',
  }),
  pricePerHour: Joi.number().min(500).required().messages({
    'number.base': 'Per hour price is required',
    'any.required': 'Per hour price is required',
    'number.min': 'Per hour price must be at least ₹500',
  }),
  pricePerDay: Joi.number().min(1000).required().greater(Joi.ref('pricePerHour')).messages({
    'number.base': 'Per day price is required',
    'any.required': 'Per day price is required',
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
    .default([])
    .messages({ 'any.only': '{#value} is not a valid amenity' }),
  images: Joi.array()
    .items(
      Joi.object({
        public_id: Joi.string().trim().required().messages({ 'any.required': 'public_id is required', 'string.empty': 'public_id cannot be empty' }),
        url: Joi.string().uri().required().messages({ 'any.required': 'Image URL is required', 'string.uri': 'Each image must be a valid URL' }),
      }).unknown(false),
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least 1 image is required',
      'array.max': `Maximum ${MAXIMUM_IMAGE_UPLOADS} images allowed`,
    }),
  description: Joi.string().trim().max(1000).allow('', null).messages({ 'string.max': 'Description cannot exceed 1000 characters' }),

  // --- FORBID (now booking collection handles blocks) ---
  blockedDates: Joi.forbidden().messages({ 'any.unknown': 'Use bookings API to block dates, not hall blockedDates' }),
  isActive: Joi.forbidden().messages({ 'any.unknown': 'isActive cannot be set on create' }),
  isVerified: Joi.forbidden(),
  isFeatured: Joi.forbidden(),
  owner: Joi.forbidden(),
  slug: Joi.forbidden(),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
  createdBy: Joi.forbidden(),
  isDeleted: Joi.forbidden(),
  deletedAt: Joi.forbidden(),
}).unknown(false);

const updateHallValidationSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional().messages({
    'string.min': 'Hall name must be at least 3 characters',
    'string.max': 'Hall name cannot exceed 100 characters',
  }),
  location: Joi.object({
    address: Joi.string().trim().min(5).max(300).optional(),
    city: Joi.string().valid('Bhatkal', 'Murdeshwar', 'Honavar', 'Kumta').insensitive().optional(),
    googleMapLink: Joi.string().uri().allow('', null).optional(),
    pincode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .allow('', null)
      .optional(),
  })
    .optional()
    .min(1)
    .unknown(false),
  capacity: Joi.number().min(50).max(10000).optional(),
  pricePerHour: Joi.number().min(500).optional(),
  pricePerDay: Joi.number().min(1000).optional(),
  contactPhone: Joi.string().trim().optional().custom(phoneCleaner).messages({ 'any.invalid': 'Please enter a valid phone number' }),
  contactPersonName: Joi.string().trim().min(2).max(50).optional(),
  amenities: Joi.array()
    .items(Joi.string().valid('AC', 'Parking', 'Kitchen', 'Dining Hall', 'Bride Room', 'Sound System', 'Decoration', 'Generator', 'CCTV', 'Lift'))
    .optional(),
  images: Joi.array()
    .items(
      Joi.object({
        public_id: Joi.string().trim().required(),
        url: Joi.string().uri().required(),
      }).unknown(false),
    )
    .min(1)
    .max(10)
    .optional(),
  description: Joi.string().trim().max(1000).allow('', null).optional(),
  isActive: Joi.boolean().optional(),

  blockedDates: Joi.forbidden(),
  isVerified: Joi.forbidden(),
  isFeatured: Joi.forbidden(),
  owner: Joi.forbidden(),
  slug: Joi.forbidden(),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
  createdBy: Joi.forbidden(),
  isDeleted: Joi.forbidden(),
  deletedAt: Joi.forbidden(),
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
    }).min(1),
  ),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number()
    .min(0)
    .when('minPrice', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('minPrice')).messages({ 'number.greater': 'maxPrice must be greater than minPrice' }),
    }),
  amenities: Joi.string().trim().max(200),
  search: Joi.string().trim().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string()
    .custom((value, helpers) => {
      for (const f of value.split(',')) {
        const clean = f.trim().replace(/^-/, '');
        if (!ALLOWED_SORT.includes(clean)) return helpers.error('any.invalid');
      }
      return value;
    })
    .default('-createdAt')
    .messages({ 'any.invalid': `sort must be one of ${ALLOWED_SORT.join(', ')}` }),
  isActive: Joi.boolean().truthy('true').falsy('false'),
}).unknown(false);

const publicHallQuerySchema = hallQuerySchema.fork(['isActive'], (s) => s.forbidden()).unknown(false);
const adminHallQuerySchema = hallQuerySchema;

const hallIdSchema = Joi.object({
  id: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]{3,100}$|^[0-9a-fA-F]{24}$/)
    .message('Invalid hall ID or slug')
    .required(),
}).unknown(false);

module.exports = { addHallValidationSchema, updateHallValidationSchema, publicHallQuerySchema, adminHallQuerySchema, hallIdSchema };
