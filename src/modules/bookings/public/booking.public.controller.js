const ApiError = require('../../../utils/apiError');
const Booking = require('../booking.model');

const getAvailability = async (req, res, next) => {
  const { hallId } = req.params;
  const { month } = req.query;

  const hallDoc = await Hall.findById(hallId).select('_id');
  if (!hallDoc) return next(new ApiError('Hall not found', 404));

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1, 0);
  end.setUTCHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    hall: hallId,
    status: { $ne: 'cancelled' }, // don't block cancelled
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select('startDate endDate type')
    .sort({ startDate: 1 });

  const blockedDates = [];
  bookings.forEach((b) => {
    let cur = new Date(b.startDate);
    const stop = new Date(b.endDate);
    while (cur <= stop) {
      blockedDates.push({
        date: cur.toISOString().split('T')[0],
        type: b.type,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  });

  res.json({ success: true, data: { blockedDates } });
};

module.exports = { getAvailability };
