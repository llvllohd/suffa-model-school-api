const Hall = require('../hallModel');
const ApiError = require('../../../utils/apiError');
const { buildFilter, buildSearch, buildSort } = require('../hallConstants');

// Get all halls (only active)
exports.getAllHalls = async (req, res) => {
  const q = req.query;
  const filter = buildFilter(q, false);
  const searchQuery = buildSearch(q.search);
  const finalQuery = searchQuery ? { $and: [filter, searchQuery] } : filter;
  const sortObj = buildSort(q.sort);

  const [halls, total] = await Promise.all([
    Hall.find(finalQuery)
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

// Get hall details
exports.getHallById = async (req, res, next) => {
  const hall = await Hall.findOne({
    _id: req.params.id,
    isActive: true,
  });
  if (!hall) return next(new ApiError('Hall not found.', 404));
  res.status(200).json({ success: true, data: hall });
};
