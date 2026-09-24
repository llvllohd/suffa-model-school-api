const router = require('express').Router();
const { validate } = require('../../middlewares/validateMiddleware');
const { isAuthenticatedUser, authorizedRole } = require('../../middlewares/authMiddleware');
const { getDashboardSummary } = require('./dashboard.controller');
const { dashboardQuerySchema } = require('./dashboard.validator');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin')); // DRY

router.get('/', validate(dashboardQuerySchema, 'query'), getDashboardSummary);

module.exports = router;
