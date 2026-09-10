const express = require('express');
const router = express.Router();

const { getAllHalls, getHallById } = require('./publicController');
const { publicHallQuerySchema, hallIdSchema } = require('../hallValidator');
const { hallSearchLimiter } = require('../../../middlewares/rateLimiterMiddleware');
const { validate } = require('../../../middlewares/validateMiddleware');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandlerMiddleware');

router.get('/', hallSearchLimiter, validate(publicHallQuerySchema, 'query'), asyncHandlerMiddleware(getAllHalls));
router.get('/:id', validate(hallIdSchema, 'params'), asyncHandlerMiddleware(getHallById));

module.exports = router;
