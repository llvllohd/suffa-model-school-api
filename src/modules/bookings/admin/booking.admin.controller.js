const ApiError = require('../../../utils/apiError');
const Booking = require('../booking.model');

const checkOverlappingBooking = async (Booking, { hallId, sDate, eDate, excludeId = null }) => {
  const query = {
    hall: hallId,
    startDate: { $lte: eDate },
    endDate: { $gte: sDate },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const overlapping = await Booking.findOne(query);
  if (overlapping) {
    throw new ApiError(
      `Hall already ${overlapping.type} from ${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]}`,
      409,
    );
  }
};

const toMidnight = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const createBooking = async (req, res, next) => {
  const { hall, startDate, endDate, type, customerName, customerPhone, advance, notes } = req.body;

  const hallFilter = { _id: hall };
  if (req.user.role !== 'super_admin') {
    hallFilter.createdBy = req.user._id;
  }

  const hallDoc = await Hall.findOne(hallFilter);
  if (!hallDoc) return next(new ApiError('Hall not found', 404));

  const sDate = toMidnight(startDate);
  const eDate = endDate ? toMidnight(endDate) : sDate;

  await checkOverlappingBooking(Booking, { hallId: hall, sDate, eDate });

  const booking = await Booking.create({
    hall,
    startDate: sDate,
    endDate: eDate,
    type,
    customerName,
    customerPhone,
    advance,
    notes,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: type === 'blocked' ? 'Dates blocked successfully.' : 'Hall booked successfully.',
    data: booking,
  });
};

const updateBooking = async (req, res, next) => {
  const { id } = req.params;

  const filter = { _id: id };
  if (req.user.role !== 'super_admin') {
    filter.createdBy = req.user._id;
  }
  const existing = await Booking.findOne(filter);
  if (!existing) return next(new ApiError('Booking not found', 404));

  const { hall, startDate, endDate, type } = req.body;
  const hallToCheck = hall || existing.hall;

  if (hall && hall.toString() !== existing.hall.toString()) {
    const newHallFilter = { _id: hall };
    if (req.user.role !== 'super_admin') {
      newHallFilter.createdBy = req.user._id;
    }
    const newHallDoc = await Hall.findOne(newHallFilter);
    if (!newHallDoc) return next(new ApiError('Hall not found or you are not authorized', 404));
  }

  const sDate = startDate ? toMidnight(startDate) : existing.startDate;
  const eDate = endDate !== undefined ? (endDate ? toMidnight(endDate) : sDate) : existing.endDate;

  if (hall || startDate || endDate) await checkOverlappingBooking(Booking, { hallId: hallToCheck, sDate, eDate, excludeId: id });

  const payload = { ...req.body };
  if (startDate) payload.startDate = sDate;
  if (endDate !== undefined) payload.endDate = eDate;

  const finalType = type || existing.type;
  let booking;

  if (finalType === 'blocked' && type === 'blocked') {
    delete payload.customerName;
    delete payload.customerPhone;
    delete payload.advance;
    booking = await Booking.findOneAndUpdate(
      filter,
      {
        $set: payload,
        $unset: { customerName: 1, customerPhone: 1, advance: 1 },
      },
      { new: true, runValidators: true },
    );
  } else {
    booking = await Booking.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    });
  }

  res.status(200).json({
    success: true,
    message: finalType === 'blocked' ? 'Blocked dates updated successfully' : 'Booking updated successfully',
    data: booking,
  });
};

const deleteBooking = async (req, res, next) => {
  const { id } = req.params;
  const filter = { _id: id };
  if (req.user.role !== 'super_admin') {
    filter.createdBy = req.user._id;
  }
  const deleted = await Booking.findOneAndDelete(filter);
  if (!deleted) {
    // Either not found OR not owner -> same 404 (don't leak existence)
    return next(new ApiError('Booking not found', 404));
  }
  res.status(200).json({
    success: true,
    message: deleted.type === 'blocked' ? 'Blocked dates deleted successfully' : 'Booking deleted successfully',
  });
};

const getAllBookings = async (req, res) => {
  const filter = {};
  if (req.query.hall) filter.hall = req.query.hall;
  if (req.user.role !== 'super_admin') {
    filter.createdBy = req.user._id;
  }
  const bookings = await Booking.find(filter).populate('hall', 'name').sort({ startDate: -1 }).lean();
  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
};

const getAvailabilityAdmin = async (req, res, next) => {
  const { hallId } = req.params;
  const { month } = req.query;

  const hallFilter = { _id: hallId };
  if (req.user.role !== 'super_admin') {
    hallFilter.createdBy = req.user._id;
  }
  const hallDoc = await Hall.findOne(hallFilter);
  if (!hallDoc) return next(new ApiError('Hall not found', 404));

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1, 0);
  end.setUTCHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    hall: hallId,
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).sort({ startDate: 1 });

  const blockedDates = [];
  bookings.forEach((b) => {
    let cur = new Date(b.startDate);
    const stop = new Date(b.endDate);
    while (cur <= stop) {
      blockedDates.push({
        date: cur.toISOString().split('T')[0],
        type: b.type,
        bookingId: b._id,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  });

  res.json({ success: true, data: { bookings, blockedDates } });
};

module.exports = { createBooking, updateBooking, deleteBooking, getAvailabilityAdmin, getAllBookings };
