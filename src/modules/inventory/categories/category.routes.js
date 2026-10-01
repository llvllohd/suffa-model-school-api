const router = require('express').Router();
const { validate } = require('../../../middlewares/validate.middleware');
const { isAuthenticatedUser, authorizedRole } = require('../../../middlewares/auth.middleware');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandler.middleware');
const { createCategorySchema, updateCategorySchema, categoryIdSchema, categoryQuerySchema } = require('./category.validator');
const { createCategory, getCategories, updateCategory, deleteCategory } = require('./category.controller');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin'));

router.get('/', validate(categoryQuerySchema, 'query'), asyncHandlerMiddleware(getCategories));
router.post('/', validate(createCategorySchema), asyncHandlerMiddleware(createCategory));
router.patch('/:id', validate(categoryIdSchema, 'params'), validate(updateCategorySchema), asyncHandlerMiddleware(updateCategory));
router.delete('/:id', validate(categoryIdSchema, 'params'), asyncHandlerMiddleware(deleteCategory));

module.exports = router;
