const ApiError = require('../../../utils/apiError');
const paginate = require('../../../utils/paginate');
const Transaction = require('./transaction.model');
const Category = require('../categories/category.model');

const createTransaction = async (req, res, next) => {
  const { amount, type, category, description, date, paymentMethod } = req.body;

  const categoryDoc = await Category.findOne({ _id: category, owner: req.user._id }).lean();
  if (!categoryDoc) return next(new ApiError('Category not found', 404));

  const transaction = await Transaction.create({
    amount,
    type,
    category,
    description,
    date,
    paymentMethod,
    owner: req.user._id,
  });

  const populated = await transaction.populate('category', 'name icon color');
  res.status(201).json({ success: true, message: 'Transaction created', data: populated });
};

const getTransactions = async (req, res) => {
  const { type, category, paymentMethod, startDate, endDate, page = 1, limit = 20 } = req.query;
  const filter = { owner: req.user._id };

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const [paginated, summary] = await Promise.all([
    paginate(Transaction, filter, {
      page,
      limit,
      sort: { date: -1 },
      populate: { path: 'category', select: 'name icon color' },
    }),
    Transaction.aggregate([{ $match: filter }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
  ]);

  const income = summary.find((s) => s._id === 'INCOME')?.total || 0;
  const expense = summary.find((s) => s._id === 'EXPENSE')?.total || 0;

  res.status(200).json({
    success: true,
    data: paginated.data,
    pagination: {
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      pages: paginated.pages,
    },
    summary: { income, expense, balance: income - expense },
  });
};

const updateTransaction = async (req, res, next) => {
  const { id } = req.params;

  // 1. Check transaction exists first - no wasted query
  const existing = await Transaction.findOne({ _id: id, owner: req.user._id });
  if (!existing) return next(new ApiError('Transaction not found', 404));

  if (req.body.category) {
    const categoryDoc = await Category.findOne({ _id: req.body.category, owner: req.user._id }).lean();
    if (!categoryDoc) return next(new ApiError('Category not found', 404));
  }

  const updated = await Transaction.findOneAndUpdate({ _id: id, owner: req.user._id }, req.body, {
    new: true,
    runValidators: true,
  }).populate('category', 'name icon color');

  res.status(200).json({ success: true, message: 'Transaction updated', data: updated });
};

const deleteTransaction = async (req, res, next) => {
  const { id } = req.params;
  const deleted = await Transaction.findOneAndDelete({ _id: id, owner: req.user._id });
  if (!deleted) return next(new ApiError('Transaction not found', 404));
  res.status(200).json({ success: true, message: 'Transaction deleted' });
};

module.exports = { createTransaction, getTransactions, updateTransaction, deleteTransaction };
