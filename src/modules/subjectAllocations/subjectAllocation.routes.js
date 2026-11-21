const express = require('express');
const router = express.Router();
const {
  createSubjectAllocation,
  getSubjectAllocations,
  getSubjectAllocationById,
  updateSubjectAllocation,
  deleteSubjectAllocation,
} = require('./subjectAllocation.controller');
const { createSubjectAllocationSchema, updateSubjectAllocationSchema, subjectAllocationParamsSchema } = require('./subjectAllocation.validator');
const { validate } = require('@/middlewares/validate.middleware');
const { isAuthenticatedUser, authorizeRoles } = require('@/middlewares/auth.middleware');
const asyncHandlerMiddleware = require('@/middlewares/asyncHandler.middleware');

router.post('/', isAuthenticatedUser, authorizeRoles('admin'), validate(createSubjectAllocationSchema), asyncHandlerMiddleware(createSubjectAllocation));
router.get('/', isAuthenticatedUser, authorizeRoles('admin', 'teacher'), asyncHandlerMiddleware(getSubjectAllocations));
router.get(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin', 'teacher'),
  validate(subjectAllocationParamsSchema, 'params'),
  asyncHandlerMiddleware(getSubjectAllocationById),
);
router.patch(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(subjectAllocationParamsSchema, 'params'),
  validate(updateSubjectAllocationSchema),
  asyncHandlerMiddleware(updateSubjectAllocation),
);
router.delete(
  '/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  validate(subjectAllocationParamsSchema, 'params'),
  asyncHandlerMiddleware(deleteSubjectAllocation),
);

module.exports = router;
