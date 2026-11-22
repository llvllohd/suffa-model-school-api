const express = require('express');
const router = express.Router();

const {
  createSubjectAssignment,
  getSubjectAssignments,
  getSubjectAssignmentById,
  updateSubjectAssignment,
  deleteSubjectAssignment,
  shareSubjectAssignment,
  unshareSubjectAssignment,
} = require('./subjectAssignment.controller');
const {
  createSubjectAssignmentSchema,
  getSubjectAssignmentsQuerySchema,
  updateSubjectAssignmentSchema,
  shareSubjectAssignmentSchema,
  subjectAssignmentParamsSchema,
} = require('./subjectAssignment.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

// POST /api/v1/subject-assignments - Admin + Main Teacher
// Main Teacher creates Monthly Assignment from his Allocation
// Admin can also create for any Allocation
router.post(
  '/',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(createSubjectAssignmentSchema),
  asyncHandlerMiddleware(createSubjectAssignment),
);

// GET /api/v1/subject-assignments - Admin, Teacher
// ?academicYear=2026&semester=1&calendarMonth=6&allocationId=...
router.get(
  '/',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(getSubjectAssignmentsQuerySchema, 'query'),
  asyncHandlerMiddleware(getSubjectAssignments),
);

// GET /api/v1/subject-assignments/:id - Admin, Teacher
router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(subjectAssignmentParamsSchema, 'params'),
  asyncHandlerMiddleware(getSubjectAssignmentById),
);

// PATCH /api/v1/subject-assignments/:id - Admin + Main Teacher - Categories + Status only
// Semester / Calendar Month / Allocation / Main Teacher / AcademicYear are fixed - Snapshot rule
router.patch(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(subjectAssignmentParamsSchema, 'params'),
  validate(updateSubjectAssignmentSchema),
  asyncHandlerMiddleware(updateSubjectAssignment),
);

// DELETE /api/v1/subject-assignments/:id - Admin Only
router.delete(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(subjectAssignmentParamsSchema, 'params'),
  asyncHandlerMiddleware(deleteSubjectAssignment),
);

// POST /api/v1/subject-assignments/:id/share - Admin, Main Teacher - Single Month only
router.post(
  '/:id/share',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(subjectAssignmentParamsSchema, 'params'),
  validate(shareSubjectAssignmentSchema),
  asyncHandlerMiddleware(shareSubjectAssignment),
);

// POST /api/v1/subject-assignments/:id/unshare - Admin, Main Teacher
// Unshare of a completed assignment is also allowed
router.post(
  '/:id/unshare',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(subjectAssignmentParamsSchema, 'params'),
  asyncHandlerMiddleware(unshareSubjectAssignment),
);

module.exports = router;
