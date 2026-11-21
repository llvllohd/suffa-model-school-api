const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) => z.string({ error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg) });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

const markEntrySchema = z
  .object({
    categoryId: objectIdField('Category'),
    obtainedMarks: z
      .number({ error: (issue) => (issue.input === undefined ? 'Obtained marks is required' : 'Obtained marks must be a number') })
      .min(0, 'Obtained marks cannot be negative'),
    // maxMarks is NOT accepted from client - backend uses snapshot from assignment
  })
  .strict();

const bulkUpsertMarkSheetSchema = z
  .object({
    assignmentId: objectIdField('Assignment'),
    sheets: z
      .array(
        z
          .object({
            studentId: objectIdField('Student'),
            marks: z.array(markEntrySchema).min(1, 'At least one mark entry is required'),
          })
          .strict(),
      )
      .min(1, 'At least one student is required'),
  })
  .strict();

const getMarkSheetsQuerySchema = z
  .object({
    assignmentId: objectIdField('Assignment').optional(),
    studentId: objectIdField('Student').optional(),
    monthKey: reqString('Month key is required', 'Month key must be a string')
      .trim()
      .regex(/^\d{4}-\d{2}$/, 'Month key must be YYYY-MM format')
      .optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  })
  .strict();

const markSheetParamsSchema = z
  .object({
    id: reqString('Mark sheet id is required', 'Mark sheet id must be a string')
      .trim()
      .min(1, 'Mark sheet id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Mark sheet id is invalid'),
  })
  .strict();

module.exports = {
  bulkUpsertMarkSheetSchema,
  getMarkSheetsQuerySchema,
  markSheetParamsSchema,
};
