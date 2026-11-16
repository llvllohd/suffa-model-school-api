const { z } = require('zod');

// --- Helper - V4 - SAME as category.validator.js ---
const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

// ✅ Section names are 1 char - "A", "B", "C" - So min 1, max 20
const nameField = reqString('Section name is required', 'Section name must be a string')
  .trim()
  .min(1, 'Section name is required')
  .max(20, 'Section name cannot exceed 20 characters');

const createSectionSchema = z.object({ classId: objectIdField('Class id'), name: nameField }).strict();

// { "name": "AA" } ✅ | { "name": "AA", "classId": "..." } ✅ | { "classId": "..." } ❌ | {} ❌
const updateSectionSchema = z
  .object({
    classId: objectIdField('Class id').optional(),
    name: nameField,
  })
  .strict();

const sectionParamsSchema = z
  .object({
    id: reqString('Section id is required', 'Section id must be a string')
      .trim()
      .min(1, 'Section id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Section id is invalid'),
  })
  .strict();

// ✅ Query - classId is OPTIONAL, .strict() blocks ?foo=bar
const sectionQuerySchema = z
  .object({
    classId: z
      .string({ error: () => 'Class id must be a string' })
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, 'Class id is invalid')
      .optional(),
  })
  .strict();

module.exports = { createSectionSchema, updateSectionSchema, sectionParamsSchema, sectionQuerySchema };
