const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) => z.string({ error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg) });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

const categoriesOverrideItem = z
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

const categoriesOverrideField = z
  .array(categoriesOverrideItem)
  .max(20, 'Cannot have more than 20 categories')
  .refine((v) => new Set(v.map((c) => c.categoryId)).size === v.length, { message: 'Duplicate category in categoriesOverride' })
  .refine(
    (v) => {
      const orders = v.filter((c) => c.order !== undefined).map((c) => c.order);
      return new Set(orders).size === orders.length;
    },
    { message: 'Duplicate order in categoriesOverride' },
  )
  .optional();

const removedCategoryIdsField = z
  .array(objectIdField('Category id'))
  .max(20, 'Cannot remove more than 20 categories')
  .refine((v) => new Set(v).size === v.length, { message: 'Duplicate category in removedCategoryIds' })
  .optional();

const categoriesNotInBoth = (data, ctx) => {
  const overrideIds = (data.categoriesOverride || []).map((c) => c.categoryId);
  const removedIds = data.removedCategoryIds || [];
  const overlap = overrideIds.filter((id) => removedIds.includes(id));
  if (overlap.length) ctx.addIssue({ code: 'custom', message: 'Category cannot be in both categoriesOverride and removedCategoryIds' });
};

// CREATE - Teacher creates Monthly Assignment from Allocation
const createSubjectAssignmentSchema = z
  .object({
    allocationId: objectIdField('Allocation'),
    semester: z
      .number({ error: () => 'Semester is required' })
      .int('Semester must be a whole number')
      .min(1, 'Semester must be 1 or 2')
      .max(2, 'Semester must be 1 or 2'),
    calendarMonth: z
      .number({ error: () => 'Calendar Month is required' })
      .int('Calendar Month must be a whole number')
      .min(1, 'Calendar Month must be at least 1')
      .max(12, 'Calendar Month cannot exceed 12'),
    academicYear: z
      .number({ error: () => 'Academic Year is required' })
      .int('Academic Year must be a whole number')
      .min(2000, 'Academic Year is invalid')
      .max(2100, 'Academic Year is invalid'),
    categoriesOverride: categoriesOverrideField,
    removedCategoryIds: removedCategoryIdsField,
  })
  .strict()
  .superRefine(categoriesNotInBoth);

// LIST - GET /?allocationId=&semester=&calendarMonth=&academicYear=&status=&page=&limit=
// Query strings are always strings, so coerce to number - ?calendarMonth=abc -> 400, not NaN filter
const getSubjectAssignmentsQuerySchema = z
  .object({
    allocationId: objectIdField('Allocation').optional(),
    semester: z.coerce
      .number({ error: () => 'Semester must be a number' })
      .int('Semester must be a whole number')
      .min(1, 'Semester must be 1 or 2')
      .max(2, 'Semester must be 1 or 2')
      .optional(),
    calendarMonth: z.coerce
      .number({ error: () => 'Calendar Month must be a number' })
      .int('Calendar Month must be a whole number')
      .min(1, 'Calendar Month must be at least 1')
      .max(12, 'Calendar Month cannot exceed 12')
      .optional(),
    academicYear: z.coerce
      .number({ error: () => 'Academic Year must be a number' })
      .int('Academic Year must be a whole number')
      .min(2000, 'Academic Year is invalid')
      .max(2100, 'Academic Year is invalid')
      .optional(),
    status: z.enum(['pending', 'completed']).optional(),
    page: z.coerce
      .number({ error: () => 'Page must be a number' })
      .int('Page must be a whole number')
      .min(1, 'Page must be at least 1')
      .optional(),
    limit: z.coerce
      .number({ error: () => 'Limit must be a number' })
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional(),
  })
  .strict();

// UPDATE - Only categories + status - semester / calendarMonth / allocation / teacher / academicYear are fixed
const updateSubjectAssignmentSchema = z
  .object({
    categoriesOverride: categoriesOverrideField,
    removedCategoryIds: removedCategoryIdsField,
    status: z.enum(['pending', 'completed']).optional(),
  })
  .strict()
  .superRefine(categoriesNotInBoth)
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required to update' });

const shareSubjectAssignmentSchema = z
  .object({
    sharedToTeacherId: objectIdField('Teacher to share with'),
    sharedUntil: z.coerce
      .date({ error: () => 'Shared Until must be a valid date' })
      .refine((d) => d > new Date(), { message: 'Shared Until must be a future date' })
      .optional(),
  })
  .strict();

const subjectAssignmentParamsSchema = z
  .object({
    id: reqString('Assignment id is required', 'Assignment id must be a string')
      .trim()
      .min(1, 'Assignment id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Assignment id is invalid'),
  })
  .strict();

module.exports = {
  createSubjectAssignmentSchema,
  getSubjectAssignmentsQuerySchema,
  updateSubjectAssignmentSchema,
  shareSubjectAssignmentSchema,
  subjectAssignmentParamsSchema,
};
