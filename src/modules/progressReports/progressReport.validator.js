const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) => z.string({ error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg) });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

const monthKeyField = reqString('Month key is required', 'Month key must be a string')
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month key must be YYYY-MM format');

// GET /api/v1/progress-reports?studentId=...&monthKey=2026-11
const getProgressReportQuerySchema = z
  .object({
    studentId: objectIdField('Student'),
    monthKey: monthKeyField,
  })
  .strict();

// GET /api/v1/progress-reports/class?classId=...&sectionId=...&monthKey=2026-11
const getClassProgressReportQuerySchema = z
  .object({
    classId: objectIdField('Class'),
    sectionId: objectIdField('Section'),
    monthKey: monthKeyField,
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  })
  .strict();

module.exports = {
  getProgressReportQuerySchema,
  getClassProgressReportQuerySchema,
};
