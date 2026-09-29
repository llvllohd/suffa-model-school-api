const Hall = require('../hall.model');
const Booking = require('../../bookings/booking.model');
const ApiError = require('../../../utils/apiError');
const { buildFilter, buildSearch, buildSort } = require('../hall.constants');
const { default: mongoose } = require('mongoose');
const paginate = require('../../../utils/paginate');

exports.getAllHalls = async (req, res) => {
  const q = req.query;
  const filter = buildFilter(q, false);
  const searchQuery = buildSearch(q.search);
  const finalQuery = searchQuery ? { $and: [filter, searchQuery] } : filter;

  const result = await paginate(Hall, finalQuery, {
    page: q.page,
    limit: q.limit,
    sort: buildSort(q.sort),
    select: '-owner -isDeleted -deletedAt -__v -isActive -isVerified',
  });

  res.status(200).json({ success: true, ...result });
};

// Get hall details (supports both slug and mongo id) + blockedDates
exports.getHallById = async (req, res, next) => {
  const { id } = req.params;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  const hall = await Hall.findOne({
    ...(isObjectId ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }),
    isActive: true,
    isVerified: true,
  })
    .select('-owner -createdBy -isDeleted -deletedAt -isActive -isVerified -__v')
    .lean();

  if (!hall) return next(new ApiError('Hall not found.', 404));

  // --- ADD BLOCKED DATES FOR NEXT 90 DAYS ---
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setMonth(end.getMonth() + 3);

  const bookings = await Booking.find({
    hall: hall._id,
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select('startDate endDate type')
    .sort({ startDate: 1 })
    .lean();

  const map = new Map();
  bookings.forEach((b) => {
    let cur = new Date(b.startDate);
    cur.setUTCHours(0, 0, 0, 0);
    const stop = new Date(b.endDate);
    stop.setUTCHours(0, 0, 0, 0);
    while (cur <= stop) {
      const key = cur.toISOString().split('T')[0];
      if (!map.has(key) || b.type === 'booked') {
        map.set(key, { date: key, type: b.type || 'booked' });
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  });

  hall.blockedDates = Array.from(map.values());

  res.status(200).json({ success: true, data: hall });
};
