const Joi = require('joi');

const createTransactionSchema = Joi.object({
  amount: Joi.number().positive().min(1).required().messages({
    'any.required': 'Amount is required',
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'number.min': 'Amount must be at least 1',
  }),
  type: Joi.string().valid('INCOME', 'EXPENSE').required().messages({
    'any.required': 'Type is required',
    'string.base': 'Type must be text',
    'string.empty': 'Type is required',
    'any.only': 'Type must be INCOME or EXPENSE',
  }),
  category: Joi.string().hex().length(24).required().messages({
    'any.required': 'Category is required',
    'string.base': 'Category must be text',
    'string.empty': 'Category is required',
    'string.hex': 'Invalid Category ID',
    'string.length': 'Invalid Category ID',
  }),
  description: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.base': 'Description must be text',
    'string.max': 'Description cannot exceed 200 chars',
  }),
  date: Joi.date().optional().max('now').messages({
    'date.base': 'Date must be valid',
    'date.max': 'Date cannot be in future',
  }),
  paymentMethod: Joi.string().valid('CASH', 'UPI', 'BANK', 'CARD', 'OTHER').optional().messages({
    'string.base': 'Payment method must be text',
    'string.empty': 'Payment method cannot be empty',
    'any.only': 'Payment method must be CASH, UPI, BANK, CARD or OTHER',
  }),
  owner: Joi.forbidden(),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
}).unknown(false);

const updateTransactionSchema = Joi.object({
  amount: Joi.number().positive().min(1).optional().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'number.min': 'Amount must be at least 1',
  }),
  category: Joi.string().hex().length(24).optional().messages({
    'string.base': 'Category must be text',
    'string.empty': 'Category cannot be empty',
    'string.hex': 'Invalid Category ID',
    'string.length': 'Invalid Category ID',
  }),
  description: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.base': 'Description must be text',
    'string.max': 'Description cannot exceed 200 chars',
  }),
  date: Joi.date().optional().max('now').messages({
    'date.base': 'Date must be valid',
    'date.max': 'Date cannot be in future',
  }),
  paymentMethod: Joi.string().valid('CASH', 'UPI', 'BANK', 'CARD', 'OTHER').optional().messages({
    'string.base': 'Payment method must be text',
    'string.empty': 'Payment method cannot be empty',
    'any.only': 'Invalid payment method',
  }),
  type: Joi.forbidden().messages({ 'any.unknown': 'Type cannot be changed after creation' }),
  owner: Joi.forbidden(),
  _id: Joi.forbidden(),
  __v: Joi.forbidden(),
})
  .min(1)
  .unknown(false)
  .messages({
    'object.min': 'Provide at least one field to update',
  });

const transactionIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'any.required': 'Transaction ID is required',
    'string.base': 'Transaction ID must be text',
    'string.empty': 'Transaction ID is required',
    'string.hex': 'Invalid Transaction ID',
    'string.length': 'Invalid Transaction ID',
  }),
}).unknown(false);

const transactionQuerySchema = Joi.object({
  type: Joi.string().valid('INCOME', 'EXPENSE').optional().messages({
    'string.base': 'Type must be text',
    'any.only': 'Type must be INCOME or EXPENSE',
  }),
  category: Joi.string().hex().length(24).optional().messages({
    'string.base': 'Category must be text',
    'string.hex': 'Invalid Category ID',
    'string.length': 'Invalid Category ID',
  }),
  paymentMethod: Joi.string().valid('CASH', 'UPI', 'BANK', 'CARD', 'OTHER').optional().messages({
    'string.base': 'Payment method must be text',
    'any.only': 'Invalid payment method',
  }),
  startDate: Joi.date().optional().messages({ 'date.base': 'Start date must be valid' }),
  endDate: Joi.date().optional().greater(Joi.ref('startDate')).messages({
    'date.base': 'End date must be valid',
    'date.greater': 'End date must be after start date',
  }),
  page: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Page must be a number',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'Limit must be a number',
  }),
}).unknown(false);

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdSchema,
  transactionQuerySchema,
};
