const { z } = require('zod');

// --- Common - Same as auth.validator.js ---
const emailSchema = z.string({ required_error: 'Email is required' }).trim().toLowerCase().max(254).email('Please enter a valid email');

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(6, 'Password should have atleast 6 characters')
  .max(128, 'Password must be less than 128 characters');

const phoneSchema = z
  .string({ required_error: 'Phone is required' })
  .trim()
  .transform((val) => {
    const cleaned = val
      .replace(/[\s\-+]/g, '')
      .replace(/^91(?=\d{10}$)/, '')
      .slice(-10);
    return cleaned;
  })
  .refine((val) => /^[6-9]\d{9}$/.test(val), 'Please enter a valid phone number');

const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be atleast 2 characters')
  .max(50, 'Name cannot exceed 50 characters');

const objectIdSchema = z
  .string({ required_error: 'Invalid id' })
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// ✅ FIX 1 - DOB: Valid date + Not in future
const dateOfBirthSchema = z.coerce
  .date({ required_error: 'Invalid date of birth' })
  .refine((d) => !isNaN(d.getTime()), { message: 'Invalid date of birth' })
  .refine((d) => d <= new Date(), { message: 'Date of birth cannot be in future' })
  .optional();

// --- CREATE USER - Admin Only ---
// Admin creates Teacher / Student / Admin
// Role decides which extra fields are required
const createUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    role: z.enum(['admin', 'teacher', 'student'], { required_error: 'Role is required' }),

    // Teacher fields - Optional
    qualification: z.string().trim().max(100, 'Qualification cannot exceed 100 characters').optional(),

    // Shared - Teacher + Student
    dateOfBirth: dateOfBirthSchema,
    gender: z.enum(['Male', 'Female']).optional(),
    address: z.string().trim().max(500, 'Address cannot exceed 500 characters').optional(),

    // Student fields - Required ONLY if role === 'student'
    rollNo: z.number().int().min(1, 'Roll number is required').optional(),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
    parentName: z.string().trim().max(50, 'Parent name cannot exceed 50 characters').optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Student must have class + section + rollNo
    if (data.role === 'student') {
      if (!data.rollNo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Roll number is required', path: ['rollNo'] });
      }
      if (!data.classId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Class is required', path: ['classId'] });
      }
      if (!data.sectionId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Section is required', path: ['sectionId'] });
      }
    }
    // Teacher / Admin must NOT send student fields
    if (data.role !== 'student' && (data.rollNo || data.classId || data.sectionId || data.parentName)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Student fields are only allowed for student role', path: ['role'] });
    }
    // Admin / Student must NOT send qualification
    if (data.role !== 'teacher' && data.qualification) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Qualification is only allowed for teacher role', path: ['role'] });
    }
  });

// --- UPDATE USER - Admin Only ---
// Admin can update name / email / phone / isActive - NOT role, NOT password
// NOTE: Role-based check (qualification vs parentName) MUST be done in controller
// because role is NOT in this payload - Controller knows existing user's role
const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    isActive: z.boolean().optional(),
    // Profile fields - If teacher / student profile exists
    qualification: z.string().trim().max(100).optional(),
    dateOfBirth: dateOfBirthSchema,
    gender: z.enum(['Male', 'Female']).optional(),
    address: z.string().trim().max(500).optional(),
    parentName: z.string().trim().max(50).optional(),
    // Student cannot change class/section/rollNo via this route - Use separate transfer route
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required to update' });

// --- Params - /users/:id ---
const userParamsSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

module.exports = {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
};
