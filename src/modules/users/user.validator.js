const { z } = require('zod');

// --- Helper - V4 - SAME as auth.validator.js ---
const reqString = (requiredMsg, typeMsg) =>
  z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg || requiredMsg),
  });

// --- Common ---
const emailSchema = reqString('Email is required', 'Email must be a string')
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email cannot exceed 254 characters')
  .email('Please enter a valid email');

const passwordSchema = reqString('Password is required', 'Password must be a string')
  .min(6, 'Password should have atleast 6 characters')
  .max(128, 'Password must be less than 128 characters');

const phoneSchema = reqString('Phone is required', 'Phone must be a string')
  .trim()
  .min(1, 'Phone is required')
  .transform((val) => {
    const cleaned = val
      .replace(/[\s\-+]/g, '')
      .replace(/^91(?=\d{10}$)/, '')
      .slice(-10);
    return cleaned;
  })
  .refine((val) => /^[6-9]\d{9}$/.test(val), 'Please enter a valid phone number');

const nameSchema = reqString('Name is required', 'Name must be a string')
  .trim()
  .min(1, 'Name is required')
  .min(2, 'Name must be atleast 2 characters')
  .max(50, 'Name cannot exceed 50 characters');

const classIdSchema = reqString('Class is required', 'Class id must be a string')
  .trim()
  .min(1, 'Class is required')
  .regex(/^[0-9a-fA-F]{24}$/, 'Class id is invalid');

const sectionIdSchema = reqString('Section is required', 'Section id must be a string')
  .trim()
  .min(1, 'Section is required')
  .regex(/^[0-9a-fA-F]{24}$/, 'Section id is invalid');

const dateOfBirthSchema = z
  .preprocess(
    (val) => (val === null || val === '' ? '___invalid-date___' : val),
    z.coerce.date({ error: (issue) => (issue.input === undefined ? 'Date of birth is required' : 'Date of birth must be a valid date') }),
  )
  .refine((d) => !isNaN(d.getTime()), { message: 'Invalid date of birth' })
  .refine((d) => d <= new Date(), { message: 'Date of birth cannot be in future' })
  .optional();

const genderSchema = z
  .enum(['Male', 'Female'], {
    error: (issue) => {
      if (issue.input === undefined) return 'Gender is required';
      return 'Gender must be Male or Female';
    },
  })
  .optional();

const qualificationSchema = z
  .string({ error: 'Qualification must be a string' })
  .trim()
  .min(1, 'Qualification is required')
  .max(100, 'Qualification cannot exceed 100 characters')
  .optional();

const addressSchema = z
  .string({ error: 'Address must be a string' })
  .trim()
  .min(1, 'Address is required')
  .max(500, 'Address cannot exceed 500 characters')
  .optional();

const parentNameSchema = z
  .string({ error: 'Parent name must be a string' })
  .trim()
  .min(1, 'Parent name is required')
  .max(50, 'Parent name cannot exceed 50 characters')
  .optional();

// ✅ rollNo is STRING - "001", "A-12", "50001" all valid
const rollNoSchema = z
  .string({ error: 'Roll number must be a string' })
  .trim()
  .min(1, 'Roll number is required')
  .max(20, 'Roll number cannot exceed 20 characters')
  .optional();

const roleSchema = z.enum(['admin', 'teacher', 'student'], {
  error: (issue) => {
    if (issue.input === undefined) return 'Role is required';
    return 'Role must be admin, teacher or student';
  },
});

// --- CREATE USER - Admin Only ---
const createUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    role: roleSchema,
    qualification: qualificationSchema,
    dateOfBirth: dateOfBirthSchema,
    gender: genderSchema,
    address: addressSchema,
    rollNo: rollNoSchema,
    classId: classIdSchema.optional(),
    sectionId: sectionIdSchema.optional(),
    parentName: parentNameSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.role === 'student') {
      if (data.rollNo === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Roll number is required', path: ['rollNo'] });
      }
      if (data.classId === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Class is required', path: ['classId'] });
      }
      if (data.sectionId === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Section is required', path: ['sectionId'] });
      }
    }
    if (data.role !== 'student' && (data.rollNo !== undefined || data.classId !== undefined || data.sectionId !== undefined || data.parentName !== undefined)) {
      ctx.addIssue({ code: 'custom', message: 'Student fields are only allowed for student role', path: ['role'] });
    }
    if (data.role !== 'teacher' && data.qualification !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'Qualification is only allowed for teacher role', path: ['role'] });
    }
  });

// --- UPDATE USER - Admin Only ---
const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    isActive: z.boolean({ error: 'isActive must be true or false' }).optional(),
    qualification: qualificationSchema,
    dateOfBirth: dateOfBirthSchema,
    gender: genderSchema,
    address: addressSchema,
    parentName: parentNameSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required to update' });

// --- Params - /users/:id ---
const userParamsSchema = z
  .object({
    id: reqString('User id is required', 'User id must be a string')
      .trim()
      .min(1, 'User id is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'User id is invalid'),
  })
  .strict();

module.exports = {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
};
