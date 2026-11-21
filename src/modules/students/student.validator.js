const { z } = require('zod');

const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

const objectIdField = (fieldName) =>
  reqString(`${fieldName} is required`, `${fieldName} must be a string`)
    .trim()
    .min(1, `${fieldName} is required`)
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} is invalid`);

const nameField = reqString('Name is required', 'Name must be a string')
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters');

const phoneField = reqString('Phone is required', 'Phone must be a string')
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Phone must be a valid 10-digit Indian number');

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

// PATCH - Admin can update name + profile fields only, email / phone / password not allowed here
const updateStudentSchema = z
  .object({
    name: nameField.optional(),
    classId: objectIdField('Class').optional(),
    sectionId: objectIdField('Section').optional(),
    rollNumber: z
      .number({ error: () => 'Roll Number is required' })
      .int('Roll Number must be a whole number')
      .min(1, 'Roll Number must be at least 1')
      .optional(),
    admissionNumber: reqString('Admission Number is required', 'Admission Number must be a string').trim().min(1).max(20).optional(),
    dateOfBirth: dobField,
    gender: genderField,
    address: addressField,
    guardianName: reqString('Guardian Name is required', 'Guardian Name must be a string').trim().min(2).max(50).optional(),
    guardianPhone: phoneField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  });

const studentParamsSchema = z
  .object({
    id: reqString('Student id is required', 'Student id must be a string')
      .trim()
      .min(1, 'Student id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Student id is invalid'),
  })
  .strict();

module.exports = { updateStudentSchema, studentParamsSchema };
