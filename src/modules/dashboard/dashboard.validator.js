const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) => z.string({ error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg) });

const dateField = reqString('Date is required', 'Date must be a string')
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be YYYY-MM-DD format');

const monthKeyField = reqString('Month key is required', 'Month key must be a string')
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month key must be YYYY-MM format');

// GET /api/v1/dashboard/admin?date=&monthKey=
// GET /api/v1/dashboard/teacher?date=&monthKey=
// GET /api/v1/dashboard/student?monthKey=
const getDashboardQuerySchema = z
  .object({
    date: dateField.optional(),
    monthKey: monthKeyField.optional(),
  })
  .strict();

module.exports = { getDashboardQuerySchema };
