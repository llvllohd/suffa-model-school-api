const express = require('express');
const router = express.Router();

const { publicHallQuerySchema, hallIdSchema } = require('../hall.validator');
const { hallSearchLimiter } = require('../../../middlewares/rateLimiter.middleware');
const { validate } = require('../../../middlewares/validate.middleware');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandler.middleware');
const { getAllHalls, getHallById } = require('./hall.public.controller');

router.get('/', hallSearchLimiter, validate(publicHallQuerySchema, 'query'), asyncHandlerMiddleware(getAllHalls));
router.get('/:id', hallSearchLimiter, validate(hallIdSchema, 'params'), asyncHandlerMiddleware(getHallById));

module.exports = router;
