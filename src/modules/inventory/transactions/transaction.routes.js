const router = require('express').Router();
const { validate } = require('../../../middlewares/validate.middleware');
const { isAuthenticatedUser, authorizedRole } = require('../../../middlewares/auth.middleware');
const asyncHandlerMiddleware = require('../../../middlewares/asyncHandler.middleware');
const { createTransactionSchema, updateTransactionSchema, transactionIdSchema, transactionQuerySchema } = require('./transaction.validator');
const { createTransaction, getTransactions, updateTransaction, deleteTransaction } = require('./transaction.controller');

router.use(isAuthenticatedUser, authorizedRole('hall_owner', 'super_admin'));

router.post('/', validate(createTransactionSchema), asyncHandlerMiddleware(createTransaction));
router.get('/', validate(transactionQuerySchema, 'query'), asyncHandlerMiddleware(getTransactions));
router.patch('/:id', validate(transactionIdSchema, 'params'), validate(updateTransactionSchema), asyncHandlerMiddleware(updateTransaction));
router.delete('/:id', validate(transactionIdSchema, 'params'), asyncHandlerMiddleware(deleteTransaction));

module.exports = router;
