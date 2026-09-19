const { HALL_UPDATABLE_FIELDS, buildFilter, buildSearch, buildSort } = require('../hallConstants');
const Hall = require('../hallModel');
const ApiError = require('../../../utils/apiError');

// Create a new hall
exports.createHall = async (req, res) => {
  const data = {
    ...req.body,
    owner: req.user._id, // or req.user.id
  };
  const hall = await Hall.create(data);
  res.status(201).json({ success: true, message: 'Hall created successfully.', data: hall });
};

// Get all halls (active + inactive)
exports.getAllHallsAdmin = async (req, res) => {
  const q = req.query;
  const page = parseInt(q.page) || 1;
  const limit = Math.min(parseInt(q.limit) || 10, 50);

  const filter = buildFilter(q, true); // true = admin
  const searchQuery = buildSearch(q.search);

  // if hall_owner, show only his halls
  if (req.user.role === 'hall_owner') {
    filter.owner = req.user._id;
  }

  const finalQuery = searchQuery ? { $and: [filter, searchQuery] } : filter;
  const sortObj = buildSort(q.sort);

  const [halls, total] = await Promise.all([
    Hall.find(finalQuery)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Hall.countDocuments(finalQuery),
  ]);

  res.status(200).json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit: limit,
    data: halls,
  });
};

// Get hall detail
exports.getHallById = async (req, res, next) => {
  const hall = await Hall.findById(req.params.id);
  if (!hall) return next(new ApiError('Hall not found', 404));

  if (req?.user?.role !== 'super_admin' && hall.owner.toString() !== req?.user?._id.toString()) {
    return next(new ApiError('Hall not found', 403));
  }

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

  // Only owner who created the hall or super_admin can update
  if (req?.user?.role !== 'super_admin' && hall.owner.toString() !== req?.user?._id.toString()) {
    return next(new ApiError('Hall not found', 403));
  }

  if (body.location) {
    Object.entries(body.location).forEach(([k, v]) => (hall.location[k] = v === '' ? undefined : v));
    delete body.location;
  }

  if (body.amenities) {
    hall.amenities = body.amenities;
    delete body.amenities;
  }

  Object.assign(hall, body);
  await hall.save(); // triggers your pre('validate') price + slug logic
  res.status(200).json({ success: true, message: 'Hall updated successfully.', data: hall });
};

// Delete (deactivate) a hall - Only for super admin
exports.deleteHall = async (req, res, next) => {
  if (req?.user?.role !== 'super_admin') {
    return next(new ApiError('Hall not found', 403));
  }

  const hall = await Hall.findById(req.params.id);
  if (!hall) return next(new ApiError('Hall not found', 404));

  hall.isActive = false;
  hall.isVerified = false;

  await hall.save();

  res.status(200).json({ success: true, message: 'Hall deleted successfully.' });
};
