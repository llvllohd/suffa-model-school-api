const express = require('express');
const router = express.Router();

const { createHall, updateHall, deleteHall, getAllHallsAdmin, getHallByIdAdmin, restoreHall, verifyHall } = require('./hall.admin.controller');
const { addHallValidationSchema, updateHallValidationSchema, hallIdSchema, adminHallQuerySchema } = require('../hall.validator');
const { validate } = require('../../../middlewares/validate.middleware');
const { isAuthenticatedUser, authorizedRole } = require('../../../middlewares/auth.middleware');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandler.middleware');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin')); // DRY

router.post('/', validate(addHallValidationSchema), asyncHandlerMiddleware(createHall));
router.get('/', validate(adminHallQuerySchema, 'query'), asyncHandlerMiddleware(getAllHallsAdmin));
router.get('/:id', validate(hallIdSchema, 'params'), asyncHandlerMiddleware(getHallByIdAdmin));
router.patch('/:id', validate(hallIdSchema, 'params'), validate(updateHallValidationSchema), asyncHandlerMiddleware(updateHall));
router.delete('/:id', validate(hallIdSchema, 'params'), asyncHandlerMiddleware(deleteHall));

// Super Admin
router.patch('/:id/verify', authorizedRole('super_admin'), validate(hallIdSchema, 'params'), asyncHandlerMiddleware(verifyHall));
router.post('/:id/restore', authorizedRole('super_admin'), validate(hallIdSchema, 'params'), asyncHandlerMiddleware(restoreHall));

module.exports = router;
