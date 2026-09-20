const Hall = require('../hall.model');
const ApiError = require('../../../utils/apiError');
const { buildFilter, buildSearch, buildSort } = require('../hall.constants');
const { default: mongoose } = require('mongoose');

// Get all halls (only active)
exports.getAllHalls = async (req, res) => {
  const q = req.query;
  const filter = buildFilter(q, false);
  const searchQuery = buildSearch(q.search);
  const finalQuery = searchQuery ? { $and: [filter, searchQuery] } : filter;
  const sortObj = buildSort(q.sort);

  const [halls, total] = await Promise.all([
    Hall.find(finalQuery)
      .select('-owner -isDeleted -deletedAt -__v -isActive -isVerified')
      .sort(sortObj)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Hall.countDocuments(finalQuery),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
    limit: q.limit,
    data: halls,
  });
};

// Get hall details (supports both slug and mongo id)
exports.getHallById = async (req, res, next) => {
  const { id } = req.params;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  const hall = await Hall.findOne({
    ...(isObjectId ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }),
    isActive: true,
    isVerified: true, // public should see only verified
  });

  if (!hall) return next(new ApiError('Hall not found.', 404));

  res.status(200).json({ success: true, data: hall });
};
