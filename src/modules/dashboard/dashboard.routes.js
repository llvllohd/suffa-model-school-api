const router = require('express').Router();
const { validate } = require('../../middlewares/validate.middleware');
const { isAuthenticatedUser, authorizedRole } = require('../../middlewares/auth.middleware');
const { getDashboardSummary } = require('./dashboard.controller');
const { dashboardQuerySchema } = require('./dashboard.validator');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin')); // DRY

router.get('/', validate(dashboardQuerySchema, 'query'), getDashboardSummary);

module.exports = router;
