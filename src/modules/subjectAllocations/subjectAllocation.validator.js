const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) => z.string({ error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg) });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

const createSubjectAllocationSchema = z
  .object({
    subjectId: objectIdField('Subject'),
    classId: objectIdField('Class'),
    sectionIds: z
      .array(objectIdField('Section id'))
      .min(1, 'At least one Section is required')
      .refine((v) => new Set(v).size === v.length, { message: 'Duplicate Section is not allowed' }),
    semesters: z
      .array(z.number().int().min(1).max(2))
      .min(1, 'At least one Semester is required')
      .refine((v) => new Set(v).size === v.length, { message: 'Duplicate Semester is not allowed' })
      .optional(),
    mainTeacherId: objectIdField('Main Teacher'),
  })
  .strict();

const updateSubjectAllocationSchema = z
  .object({
    sectionIds: z
      .array(objectIdField('Section id'))
      .min(1, 'At least one Section is required')
      .refine((v) => new Set(v).size === v.length, { message: 'Duplicate Section is not allowed' })
      .optional(),
    semesters: z
      .array(z.number().int().min(1).max(2))
      .min(1, 'At least one Semester is required')
      .refine((v) => new Set(v).size === v.length, { message: 'Duplicate Semester is not allowed' })
      .optional(),
    mainTeacherId: objectIdField('Main Teacher').optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required to update' });

const subjectAllocationParamsSchema = z
  .object({
    id: reqString('Allocation id is required', 'Allocation id must be a string')
      .trim()
      .min(1, 'Allocation id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Allocation id is invalid'),
  })
  .strict();

module.exports = {
  createSubjectAllocationSchema,
  updateSubjectAllocationSchema,
  subjectAllocationParamsSchema,
};
