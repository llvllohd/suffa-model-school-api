const router = require('express').Router();
const { validate } = require('../../../middlewares/validateMiddleware');
const { authorizedRole, isAuthenticatedUser } = require('../../../middlewares/authMiddleware');
const { availabilityQuerySchema, createBookingSchema, updateBookingSchema, hallQuerySchema, bookingIdSchema, hallIdSchema } = require('../booking.validator');
const { getAvailabilityAdmin, getAllBookings, createBooking, updateBooking, deleteBooking } = require('./bookingController');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandlerMiddleware');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin')); // DRY

router.get('/availability/:hallId', validate(hallIdSchema, 'params'), validate(availabilityQuerySchema, 'query'), asyncHandlerMiddleware(getAvailabilityAdmin));
router.get('/', validate(hallQuerySchema, 'query'), asyncHandlerMiddleware(getAllBookings));
router.post('/', validate(createBookingSchema), asyncHandlerMiddleware(createBooking));
router.patch('/:id', validate(bookingIdSchema, 'params'), validate(updateBookingSchema), asyncHandlerMiddleware(updateBooking));
router.delete('/:id', validate(bookingIdSchema, 'params'), asyncHandlerMiddleware(deleteBooking));

module.exports = router;
