const express = require('express');
const router = express.Router();

const { createHall, updateHall, deleteHall, getAllHallsAdmin, getHallById } = require('./adminController');
const { addHallValidationSchema, updateHallValidationSchema, hallIdSchema, adminHallQuerySchema } = require('../hallValidator');
const { validate } = require('../../../middlewares/validateMiddleware');
const { isAuthenticatedUser, authorizedRole } = require('../../../middlewares/authMiddleware');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandlerMiddleware');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin')); // DRY

router.post('/', validate(addHallValidationSchema), asyncHandlerMiddleware(createHall));
router.get('/', validate(adminHallQuerySchema, 'query'), asyncHandlerMiddleware(getAllHallsAdmin));
router.get('/:id', validate(hallIdSchema, 'params'), asyncHandlerMiddleware(getHallById));
router.patch('/:id', validate(hallIdSchema, 'params'), validate(updateHallValidationSchema), asyncHandlerMiddleware(updateHall));
router.delete('/:id', authorizedRole('super_admin'), validate(hallIdSchema, 'params'), asyncHandlerMiddleware(deleteHall));

module.exports = router;
