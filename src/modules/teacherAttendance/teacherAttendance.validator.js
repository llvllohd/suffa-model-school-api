const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) => z.string({ error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg) });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

const dateField = reqString('Date is required', 'Date must be a string')
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be YYYY-MM-DD format');

const monthKeyField = reqString('Month key is required', 'Month key must be a string')
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month key must be YYYY-MM format');

const teacherStatusField = z.enum(['Present', 'Absent'], {
  error: (issue) => (issue.input === undefined ? 'Status is required' : 'Status must be Present or Absent'),
});

// POST /api/v1/teacher-attendance - Admin fills all teachers in one call
const upsertTeacherAttendanceSchema = z
  .object({
    date: dateField,
    records: z
      .array(
        z
          .object({
            teacherId: objectIdField('Teacher'),
            status: teacherStatusField,
            reason: z.string({ error: 'Reason must be a string' }).trim().max(200, 'Reason must be at most 200 characters').optional().default(''),
          })
          .strict(),
      )
      .min(1, 'At least one attendance record is required'),
  })
  .strict();

// GET /api/v1/teacher-attendance?date=&monthKey=
// FIX: date and monthKey cannot be sent together - old code silently ignored monthKey when date was sent
const getTeacherAttendanceQuerySchema = z
  .object({
    date: dateField.optional(),
    monthKey: monthKeyField.optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  })
  .strict()
  .refine((data) => !(data.date && data.monthKey), { message: 'Send either date or monthKey, not both' });

// GET /api/v1/teacher-attendance/my?monthKey=2026-11
const getMyTeacherAttendanceQuerySchema = z.object({ monthKey: monthKeyField }).strict();

// GET /api/v1/teacher-attendance/summary?teacherId=&monthKey=
const getTeacherAttendanceSummaryQuerySchema = z
  .object({
    teacherId: objectIdField('Teacher'),
    monthKey: monthKeyField,
  })
  .strict();

const teacherAttendanceParamsSchema = z
  .object({
    id: reqString('Attendance id is required', 'Attendance id must be a string')
      .trim()
      .min(1, 'Attendance id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Attendance id is invalid'),
  })
  .strict();

module.exports = {
  upsertTeacherAttendanceSchema,
  getTeacherAttendanceQuerySchema,
  getMyTeacherAttendanceQuerySchema,
  getTeacherAttendanceSummaryQuerySchema,
  teacherAttendanceParamsSchema,
};
