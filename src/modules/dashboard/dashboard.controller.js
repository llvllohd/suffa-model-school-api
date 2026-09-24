const ApiError = require('../../utils/apiError');
const Booking = require('../bookings/booking.model');
const Hall = require('../halls/hall.model');

const getDashboardSummary = async (req, res, next) => {
  const { hall, month } = req.query;

  const hallFilter = { _id: hall };
  if (req.user.role !== 'super_admin') hallFilter.owner = req.user._id;
  const hallDoc = await Hall.findOne(hallFilter);
  if (!hallDoc) return next(new ApiError('Hall not found', 404));

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1, 0);
  end.setUTCHours(23, 59, 59, 999);

  const allBookings = await Booking.find({
    hall,
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).lean();

  const bookings = allBookings.filter((b) => b.type === 'booked');

  const totalBookings = bookings.length;
  const pending = bookings.filter((b) => b.paymentStatus === 'pending').length;
  const partial = bookings.filter((b) => b.paymentStatus === 'partial').length;
  const paid = bookings.filter((b) => b.paymentStatus === 'paid').length;

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const pendingAmount = bookings.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
  const totalValue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const daysInMonth = new Date(start.getUTCFullYear(), start.getUTCMonth() + 1, 0).getDate();
  const occupiedDaysSet = new Set();

  allBookings.forEach((b) => {
    const s = new Date(b.startDate);
    const e = b.endDate ? new Date(b.endDate) : new Date(s);
    let cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
    const stop = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
    while (cur <= stop) {
      if (cur >= start && cur <= end) occupiedDaysSet.add(cur.toISOString().split('T')[0]);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  });

  res.json({
    success: true,
    data: {
      hall: { _id: hallDoc._id, name: hallDoc.name },
      month,
      totalBookings,
      totalBlocked: allBookings.length - totalBookings,
      paymentBreakdown: { pending, partial, paid },
      amounts: { totalValue, totalRevenue, pendingAmount },
      availability: {
        daysInMonth,
        bookedDays: occupiedDaysSet.size,
        availableDays: daysInMonth - occupiedDaysSet.size,
      },
      bookings,
    },
  });
};

module.exports = { getDashboardSummary };
