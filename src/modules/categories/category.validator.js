const { z } = require('zod');

// --- Helper - V4 - SAME as auth.validator.js + user.validator.js ---
const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

const nameField = reqString('Category name is required', 'Category name must be a string')
  .trim()
  .min(1, 'Category name is required')
  .min(2, 'Category name must be atleast 2 characters')
  .max(50, 'Category name cannot exceed 50 characters');

const createCategorySchema = z.object({ name: nameField }).strict();

// ✅ PATCH - No isActive - isActive changes ONLY via DELETE endpoint
const updateCategorySchema = z.object({ name: nameField }).strict();

const categoryParamsSchema = z
  .object({
    id: reqString('Category id is required', 'Category id must be a string')
      .trim()
      .min(1, 'Category id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Category id is invalid'),
  })
  .strict();

module.exports = { createCategorySchema, updateCategorySchema, categoryParamsSchema };
