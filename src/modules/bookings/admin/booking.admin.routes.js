const router = require('express').Router();
const { validate } = require('../../../middlewares/validate.middleware');
const { authorizedRole, isAuthenticatedUser } = require('../../../middlewares/auth.middleware');
const { availabilityQuerySchema, createBookingSchema, updateBookingSchema, bookingQuerySchema, bookingIdSchema, hallIdSchema } = require('../booking.validator');
const { getAvailabilityAdmin, getAllBookings, createBooking, updateBooking, deleteBooking } = require('./booking.admin.controller');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandler.middleware');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin')); // DRY

router.get('/availability/:hallId', validate(hallIdSchema, 'params'), validate(availabilityQuerySchema, 'query'), asyncHandlerMiddleware(getAvailabilityAdmin));
router.get('/', validate(bookingQuerySchema, 'query'), asyncHandlerMiddleware(getAllBookings));
router.post('/', validate(createBookingSchema), asyncHandlerMiddleware(createBooking));
router.patch('/:id', validate(bookingIdSchema, 'params'), validate(updateBookingSchema), asyncHandlerMiddleware(updateBooking));
router.delete('/:id', validate(bookingIdSchema, 'params'), asyncHandlerMiddleware(deleteBooking));

module.exports = router;
