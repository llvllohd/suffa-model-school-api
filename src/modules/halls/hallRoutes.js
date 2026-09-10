const express = require('express');
const router = express.Router();

const { createHall, updateHall, deleteHall, getHallById, getAllHalls } = require('./hallController');
const { validate } = require('../../middlewares/validate');
const { addHallValidationSchema, updateHallValidationSchema, publicHallQuerySchema, hallIdSchema } = require('./hallValidator');
const { isAuthenticatedUser, authorizedRole } = require('../../middlewares/auth');
const { hallSearchLimiter } = require('../../middlewares/rateLimiter');

// PUBLIC - anyone can browse
router.get('/', hallSearchLimiter, validate(publicHallQuerySchema, 'query'), getAllHalls);
router.get('/:id', validate(hallIdSchema, 'params'), getHallById);

// ADMIN ONLY - manage
router.post('/', isAuthenticatedUser, authorizedRole('admin'), validate(addHallValidationSchema), createHall);
router.patch('/:id', isAuthenticatedUser, authorizedRole('admin'), validate(hallIdSchema, 'params'), validate(updateHallValidationSchema), updateHall);
router.delete('/:id', isAuthenticatedUser, authorizedRole('admin'), validate(hallIdSchema, 'params'), deleteHall);

module.exports = router;
