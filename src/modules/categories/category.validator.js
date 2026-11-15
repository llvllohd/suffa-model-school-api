const { z } = require('zod');

const createCategorySchema = z
  .object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(2, 'Category name must be atleast 2 characters')
      .max(50, 'Category name cannot exceed 50 characters'),
  })
  .strict();

const updateCategorySchema = z
  .object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(2, 'Category name must be atleast 2 characters')
      .max(50, 'Category name cannot exceed 50 characters')
      .optional(),
    isActive: z.boolean({ required_error: 'isActive is required' }).optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: 'At least one field (name or isActive) is required',
    path: ['name'],
  });

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
