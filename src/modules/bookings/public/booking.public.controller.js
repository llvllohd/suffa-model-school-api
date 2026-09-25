const ApiError = require('../../../utils/apiError');
const Booking = require('../booking.model');
const Hall = require('../../halls/hall.model');

const getAvailability = async (req, res, next) => {
  const { hallId } = req.params;
  const { month } = req.query; // YYYY-MM validated by Joi

  const hallDoc = await Hall.findById(hallId).select('_id');
  if (!hallDoc) return next(new ApiError('Hall not found', 404));

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1, 0);
  end.setUTCHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    hall: hallId,
    status: { $ne: 'cancelled' },
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
      if (key.startsWith(month)) {
        if (!map.has(key) || b.type === 'booked') {
          map.set(key, { date: key, type: b.type || 'booked' });
        }
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  });

  res.json({ success: true, data: { blockedDates: Array.from(map.values()) } });
};

module.exports = { getAvailability };
