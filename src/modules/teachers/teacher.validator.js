const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

const nameField = reqString('Name is required', 'Name must be a string')
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters');

const dobField = z.coerce
  .date({ error: () => 'Date of Birth is invalid' })
  .refine((d) => d <= new Date(), { message: 'Date of birth cannot be in future' })
  .optional();

const genderField = z.enum(['Male', 'Female'], { error: () => 'Gender must be Male or Female' }).optional();

const addressField = reqString('Address is required', 'Address must be a string')
  .trim()
  .min(1, 'Address is required')
  .max(500, 'Address cannot exceed 500 characters')
  .optional();

const qualificationField = reqString('Qualification is required', 'Qualification must be a string')
  .trim()
  .min(1, 'Qualification is required')
  .max(100, 'Qualification cannot exceed 100 characters')
  .optional();

// PATCH - Admin can update name + profile fields only, email / phone / password not allowed here
const updateTeacherSchema = z
  .object({
    name: nameField.optional(),
    qualification: qualificationField,
    dateOfBirth: dobField,
    gender: genderField,
    address: addressField,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

const teacherParamsSchema = z
  .object({
    id: reqString('Teacher id is required', 'Teacher id must be a string')
      .trim()
      .min(1, 'Teacher id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Teacher id is invalid'),
  })
  .strict();

module.exports = { updateTeacherSchema, teacherParamsSchema };
