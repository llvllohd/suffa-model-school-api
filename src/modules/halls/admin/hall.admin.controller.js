const { HALL_UPDATABLE_FIELDS, buildFilter, buildSearch, buildSort } = require('../hall.constants');
const Hall = require('../hall.model');
const ApiError = require('../../../utils/apiError');
const paginate = require('../../../utils/paginate');

// Create a new hall
exports.createHall = async (req, res, next) => {
  const isSuperAdmin = req.user.role === 'super_admin';

  if (isSuperAdmin && !req.body.owner) {
    return next(new ApiError('Owner is required for creating a hall.', 400));
  }

  const data = {
    ...req.body,
    owner: isSuperAdmin ? req.body.owner : req.user._id,
    createdBy: req.user._id,
  };

  const hall = await Hall.create(data);
  res.status(201).json({ success: true, message: 'Hall created successfully.', data: hall });
};

// Get all halls (active + inactive)
exports.getAllHallsAdmin = async (req, res) => {
  const q = req.query;

  const filter = buildFilter(q, true);
  const searchQuery = buildSearch(q.search);

  if (req.user.role === 'hall_owner') {
    filter.owner = req.user._id;
  }

  const finalQuery = searchQuery ? { $and: [filter, searchQuery] } : filter;

  const result = await paginate(Hall, finalQuery, {
    page: q.page,
    limit: q.limit,
    sort: buildSort(q.sort),
  });

  res.status(200).json({ success: true, ...result });
};

// Get hall detail
exports.getHallByIdAdmin = async (req, res, next) => {
  const hall = await Hall.findById(req.params.id);
  if (!hall) return next(new ApiError('Hall not found.', 404));

  if (req.user.role !== 'super_admin' && hall.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError('You are not authorized to view this hall.', 403));
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
  if (!hall) return next(new ApiError('Hall not found.', 404));

  if (req.user.role !== 'super_admin' && hall.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError('You are not authorized to update this hall.', 403));
  }

  if (body.location) {
    Object.entries(body.location).forEach(([k, v]) => {
      // Don't set undefined on required field address
      if (v === '' && k !== 'address') {
        hall.location[k] = undefined;
      } else if (v !== '') {
        hall.location[k] = v;
      }
    });
    delete body.location;
  }

  if (body.amenities) {
    hall.amenities = body.amenities;
    delete body.amenities;
  }

  Object.assign(hall, body);
  await hall.save();
  res.status(200).json({ success: true, message: 'Hall updated successfully.', data: hall });
};

// Delete (soft delete)
exports.deleteHall = async (req, res, next) => {
  const hall = await Hall.findById(req.params.id);
  if (!hall) return next(new ApiError('Hall not found.', 404));

  if (req.user.role !== 'super_admin' && hall.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError('You are not authorized to delete this hall.', 403));
  }

  await hall.softDelete();
  res.status(200).json({ success: true, message: 'Hall deleted successfully.' });
};

// Restore - Only super_admin
exports.restoreHall = async (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return next(new ApiError('You are not authorized to restore halls.', 403));
  }

  const hall = await Hall.findById(req.params.id).setOptions({ withDeleted: true });
  if (!hall) return next(new ApiError('Hall not found.', 404));

  await hall.restore();
  res.status(200).json({ success: true, message: 'Hall restored successfully.', data: hall });
};

// Verify / Unverify - Only super_admin
exports.verifyHall = async (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return next(new ApiError('You are not authorized to verify halls.', 403));
  }

  const hall = await Hall.findById(req.params.id);
  if (!hall) return next(new ApiError('Hall not found.', 404));

  hall.isVerified = !hall.isVerified;
  await hall.save();

  res.status(200).json({
    success: true,
    message: `Hall ${hall.isVerified ? 'verified' : 'unverified'} successfully.`,
    data: hall,
  });
};
