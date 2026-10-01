const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(30).required().messages({
    'any.required': 'Category name is required',
    'string.base': 'Category name must be text',
    'string.empty': 'Category name cannot be empty',
    'string.min': 'Category must be at least 2 chars',
    'string.max': 'Category cannot exceed 30 chars',
  }),
  type: Joi.string().valid('INCOME', 'EXPENSE').required().messages({
    'any.required': 'Type is required',
    'string.base': 'Type must be text',
    'string.empty': 'Type cannot be empty',
    'any.only': 'Type must be INCOME or EXPENSE',
  }),
  icon: Joi.string().trim().max(50).optional().allow('', null).messages({
    'string.base': 'Icon must be text',
    'string.empty': 'Icon cannot be empty',
    'string.max': 'Icon cannot exceed 50 characters',
  }),
  color: Joi.string()
    .trim()
    .pattern(/^#([0-9A-F]{3}){1,2}$/i)
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Color must be text',
      'string.empty': 'Color cannot be empty',
      'string.pattern.base': 'Color must be a valid hex code like #10B981',
    }),
  owner: Joi.forbidden().messages({ 'any.unknown': 'Owner should not be provided' }),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
  createdAt: Joi.forbidden(),
  updatedAt: Joi.forbidden(),
}).unknown(false);

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(30).optional().messages({
    'string.base': 'Category name must be text',
    'string.empty': 'Category name cannot be empty',
    'string.min': 'Category must be at least 2 chars',
    'string.max': 'Category cannot exceed 30 chars',
  }),
  icon: Joi.string().trim().max(50).optional().allow('', null).messages({
    'string.base': 'Icon must be text',
    'string.empty': 'Icon cannot be empty',
    'string.max': 'Icon cannot exceed 50 characters',
  }),
  color: Joi.string()
    .trim()
    .pattern(/^#([0-9A-F]{3}){1,2}$/i)
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'Color must be text',
      'string.empty': 'Color cannot be empty',
      'string.pattern.base': 'Color must be a valid hex code like #10B981',
    }),
  type: Joi.forbidden().messages({ 'any.unknown': 'Type cannot be changed' }),
  owner: Joi.forbidden().messages({ 'any.unknown': 'Owner cannot be changed' }),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
})
  .min(1)
  .messages({ 'object.min': 'At least one field is required to update' })
  .unknown(false);

const categoryIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.base': 'ID must be text',
    'string.empty': 'Category ID is required',
    'string.hex': 'Invalid ID format',
    'string.length': 'Invalid ID format',
    'any.required': 'Category ID is required',
  }),
}).unknown(false);

const categoryQuerySchema = Joi.object({
  type: Joi.string().valid('INCOME', 'EXPENSE').optional().messages({
    'string.base': 'Type must be text',
    'string.empty': 'Type cannot be empty',
    'any.only': 'Type must be INCOME or EXPENSE',
  }),
}).unknown(false);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  categoryQuerySchema,
};
