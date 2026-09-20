const express = require('express');
const router = express.Router();

const { publicHallQuerySchema, hallIdSchema } = require('../hall.validator');
const { hallSearchLimiter } = require('../../../middlewares/rateLimiterMiddleware');
const { validate } = require('../../../middlewares/validateMiddleware');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandlerMiddleware');
const { getAllHalls, getHallById } = require('./hall.public.controller');

router.get('/', hallSearchLimiter, validate(publicHallQuerySchema, 'query'), asyncHandlerMiddleware(getAllHalls));
router.get('/:id', validate(hallIdSchema, 'params'), asyncHandlerMiddleware(getHallById));

module.exports = router;
