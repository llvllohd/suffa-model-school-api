const { HALL_UPDATABLE_FIELDS } = require('../hallConstants');
const Hall = require('../hallModel');
const ApiError = require('../../../utils/apiError');

// Create a new hall
exports.createHall = async (req, res) => {
  // req.body is already validated & cleaned by middleware
  const hall = await Hall.create(req.body);
  res.status(201).json({ success: true, message: 'Hall created successfully.', data: hall });
};

// Get all halls (active + inactive)
exports.getAllHallsAdmin = async (req, res) => {
  const q = req.query;
  const filter = buildFilter(q, true); // true = admin
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

exports.getHallById = async (req, res, next) => {
  const hall = await Hall.findById(req.params.id);
  if (!hall) return next(new ApiError('Hall not found', 404));
  res.status(200).json({ success: true, data: hall });
};

// Update hall details
exports.updateHall = async (req, res, next) => {
  const body = {};
  HALL_UPDATABLE_FIELDS.forEach((f) => {
    if (req.body[f] !== undefined) body[f] = req.body[f];
  });
  const hall = await Hall.findById(req.params.id);
  if (!hall) return next(new ApiError('Hall not found', 404));
  if (body.location) {
    Object.entries(body.location).forEach(([k, v]) => (hall.location[k] = v === '' ? null : v));
    delete body.location;
  }
  Object.assign(hall, body);
  await hall.save(); // triggers your pre('validate') price check
  res.status(200).json({ success: true, message: 'Hall updated successfully.', data: hall });
};

// Delete (deactivate) a hall
exports.deleteHall = async (req, res, next) => {
  const hall = await Hall.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!hall) return next(new ApiError('Hall not found', 404));
  res.status(200).json({ success: true, message: 'Hall deleted successfully.' });
};
