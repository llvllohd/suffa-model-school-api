const router = require('express').Router();
const { validate } = require('../../middlewares/validateMiddleware');
const { availabilityQuerySchema, hallIdSchema } = require('./bookingValidator');
const asyncHandlerMiddleware = require('../../middlewares/asyncHandlerMiddleware');
const { getAvailability } = require('./booking.public.controller');

router.get('/availability/:hallId', validate(hallIdSchema, 'params'), validate(availabilityQuerySchema, 'query'), asyncHandlerMiddleware(getAvailability));

module.exports = router;
