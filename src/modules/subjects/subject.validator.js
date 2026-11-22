const { z } = require('zod');

// Helper - V4 - SAME as category.validator.js
const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

// Same as Category - min 2, not 1 like Class
const nameField = reqString('Subject name is required', 'Subject name must be a string')
  .trim()
  .min(2, 'Subject name must be at least 2 characters')
  .max(50, 'Subject name cannot exceed 50 characters');

const defaultCategoryItem = z
  .object({
    categoryId: objectIdField('Category id'),
    maxMarks: z
      .number({ error: () => 'Max Marks is required' })
      .int('Max Marks must be a whole number')
      .min(1, 'Max Marks must be at least 1')
      .max(1000, 'Max Marks cannot exceed 1000'),
    order: z
      .number({ error: () => 'Order must be a number' })
      .int('Order must be a whole number')
      .min(1, 'Order must be at least 1')
      .optional(),
  })
  .strict();

const defaultCategoriesField = z.array(defaultCategoryItem).max(20, 'Cannot have more than 20 categories').optional();

const createSubjectSchema = z.object({ name: nameField, defaultCategories: defaultCategoriesField }).strict();

// PATCH - Both optional, but at least 1 required
// { "name": "English" } - valid | { "defaultCategories": [...] } - valid | { "defaultCategories": [] } - valid, Clear all | {} - invalid
const updateSubjectSchema = z
  .object({
    name: nameField.optional(),
    defaultCategories: defaultCategoriesField,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

const subjectParamsSchema = z
  .object({
    id: reqString('Subject id is required', 'Subject id must be a string')
      .trim()
      .min(1, 'Subject id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Subject id is invalid'),
  })
  .strict();

module.exports = { createSubjectSchema, updateSubjectSchema, subjectParamsSchema };
