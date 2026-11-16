const { z } = require('zod');

// --- Helper - V4 - SAME as category.validator.js ---
const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

// ✅ Class names can be 1 char - "1", "2", "KG" - So min 1, not 2 like Category
const nameField = reqString('Class name is required', 'Class name must be a string')
  .trim()
  .min(1, 'Class name is required')
  .max(50, 'Class name cannot exceed 50 characters');

// ✅ Optional - Can be omitted, can be "" to clear it
const descriptionField = z
  .string({ error: () => 'Class description must be a string' })
  .trim()
  .max(200, 'Class description cannot exceed 200 characters')
  .optional();

const createClassSchema = z.object({ name: nameField, description: descriptionField }).strict();

const updateClassSchema = z
  .object({
    name: nameField.optional(),
    description: descriptionField,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

const classParamsSchema = z
  .object({
    id: reqString('Class id is required', 'Class id must be a string')
      .trim()
      .min(1, 'Class id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Class id is invalid'),
  })
  .strict();

module.exports = { createClassSchema, updateClassSchema, classParamsSchema };
