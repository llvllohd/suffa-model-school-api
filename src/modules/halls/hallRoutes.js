const express = require('express');
const router = express.Router();

const { createHall, updateHall, deleteHall, getHallById, getAllHalls } = require('./hallController');
const { addHallValidationSchema, updateHallValidationSchema, publicHallQuerySchema, hallIdSchema } = require('./hallValidator');
const { validate } = require('../../middlewares/validateMiddleware');
const { isAuthenticatedUser, authorizedRole } = require('../../middlewares/authMiddleware');
const { hallSearchLimiter } = require('../../middlewares/rateLimiterMiddleware');
const asyncHandlerMiddleware = require('../../middlewares/asyncHandlerMiddleware');

// PUBLIC - anyone can browse
router.get('/', hallSearchLimiter, validate(publicHallQuerySchema, 'query'), getAllHalls);
router.get('/:id', validate(hallIdSchema, 'params'), getHallById);

// ADMIN ONLY - manage
router.post('/', isAuthenticatedUser, authorizedRole('admin'), validate(addHallValidationSchema), asyncHandlerMiddleware(createHall));
router.patch(
  '/:id',
  isAuthenticatedUser,
  authorizedRole('admin'),
  validate(hallIdSchema, 'params'),
  validate(updateHallValidationSchema),
  asyncHandlerMiddleware(updateHall),
);
router.delete('/:id', isAuthenticatedUser, authorizedRole('admin'), validate(hallIdSchema, 'params'), asyncHandlerMiddleware(deleteHall));

module.exports = router;
