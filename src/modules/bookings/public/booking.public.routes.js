const router = require('express').Router();
const { availabilityQuerySchema, hallIdSchema } = require('../booking.validator');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandler.middleware');
const { getAvailability } = require('./booking.public.controller');
const { validate } = require('../../../middlewares/validate.middleware');

router.get('/availability/:hallId', validate(hallIdSchema, 'params'), validate(availabilityQuerySchema, 'query'), asyncHandlerMiddleware(getAvailability));

module.exports = router;
