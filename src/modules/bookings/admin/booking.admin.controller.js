const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');
const Booking = require('../booking.model');
const Hall = require('../../halls/hall.model');
const paginate = require('../../../utils/paginate');

const checkOverlappingBooking = async (BookingModel, { hallId, sDate, eDate, excludeId = null }, session = null) => {
  const query = {
    hall: hallId,
    startDate: { $lte: eDate },
    endDate: { $gte: sDate },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const overlapping = await BookingModel.findOne(query).session(session);
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

const calcPayment = (total, paid) => {
  const totalNum = Number(total) || 0;
  const paidNum = Number(paid) || 0;
  const remaining = Math.max(0, totalNum - paidNum);
  let status = 'pending';
  if (paidNum === 0) status = 'pending';
  else if (paidNum >= totalNum) status = 'paid';
  else status = 'partial';
  return { remaining, status };
};

const createBooking = async (req, res, next) => {
  const { hall, startDate, endDate, type, customerName, customerPhone, totalAmount, paidAmount, notes } = req.body;

  const hallFilter = { _id: hall };
  if (req.user.role !== 'super_admin') hallFilter.owner = req.user._id;

  const hallDoc = await Hall.findOne(hallFilter);
  if (!hallDoc) return next(new ApiError('Hall not found', 404));

  const sDate = toMidnight(startDate);
  const eDate = endDate ? toMidnight(endDate) : sDate;

  let payload = {
    hall,
    owner: hallDoc.owner,
    startDate: sDate,
    endDate: eDate,
    type,
    notes,
    createdBy: req.user._id,
  };

  if (type === 'booked') {
    const paid = paidAmount ?? 0;
    if (paid > totalAmount) return next(new ApiError('Paid amount cannot exceed total amount', 400));
    const { remaining, status } = calcPayment(totalAmount, paid);
    payload = { ...payload, customerName, customerPhone, totalAmount, paidAmount: paid, remainingAmount: remaining, paymentStatus: status };
  }

  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(async () => {
      await checkOverlappingBooking(Booking, { hallId: hall, sDate, eDate }, session);
      const created = await Booking.create([payload], { session });
      booking = created[0];
    });
  } finally {
    session.endSession();
  }

  res.status(201).json({
    success: true,
    message: type === 'blocked' ? 'Dates blocked successfully.' : 'Hall booked successfully.',
    data: booking,
  });
};

const updateBooking = async (req, res, next) => {
  const { id } = req.params;

  const existing = await Booking.findById(id);
  if (!existing) return next(new ApiError('Booking not found', 404));

  if (req.user.role !== 'super_admin' && existing.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError('Not authorized to update this booking', 403));
  }

  const { hall, startDate, endDate, type } = req.body;
  const hallToCheck = hall || existing.hall;
  let newHallOwner = null;

  if (hall && hall.toString() !== existing.hall.toString()) {
    const hallFilter = { _id: hall };
    if (req.user.role !== 'super_admin') hallFilter.owner = req.user._id;

    const newHallDoc = await Hall.findOne(hallFilter);
    if (!newHallDoc) return next(new ApiError('New hall not found or not owned by you', 404));
    newHallOwner = newHallDoc.owner;
  }

  const sDate = startDate ? toMidnight(startDate) : existing.startDate;
  const eDate = endDate !== undefined ? (endDate ? toMidnight(endDate) : sDate) : existing.endDate;

  const payload = { ...req.body };
  if (startDate) payload.startDate = sDate;
  if (endDate !== undefined) payload.endDate = eDate;
  if (newHallOwner) payload.owner = newHallOwner;

  const finalType = type || existing.type;

  if (finalType === 'booked') {
    if (existing.type === 'blocked' && finalType === 'booked') {
      if (payload.totalAmount == null) return next(new ApiError('Total amount is required when converting blocked to booked', 400));
      if (!payload.customerName) return next(new ApiError('Customer name is required when converting blocked to booked', 400));
      if (!payload.customerPhone) return next(new ApiError('Customer phone is required when converting blocked to booked', 400));
    }
    const total = payload.totalAmount ?? existing.totalAmount ?? 0;
    const paid = payload.paidAmount ?? existing.paidAmount ?? 0;
    if (total === 0) return next(new ApiError('Total amount is required for booked type', 400));
    if (paid > total) return next(new ApiError('Paid amount cannot exceed total amount', 400));
    const { remaining, status } = calcPayment(total, paid);
    payload.totalAmount = total;
    payload.paidAmount = paid;
    payload.remainingAmount = remaining;
    payload.paymentStatus = status;
  }

  const needsOverlapCheck = !!(hall || startDate || endDate);

  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(async () => {
      if (needsOverlapCheck) {
        await checkOverlappingBooking(Booking, { hallId: hallToCheck, sDate, eDate, excludeId: id }, session);
      }

      if (finalType === 'blocked') {
        booking = await Booking.findByIdAndUpdate(
          id,
          { $set: payload, $unset: { customerName: 1, customerPhone: 1, totalAmount: 1, paidAmount: 1, remainingAmount: 1, paymentStatus: 1 } },
          { new: true, runValidators: true, session },
        );
      } else {
        booking = await Booking.findByIdAndUpdate(id, payload, { new: true, runValidators: true, session });
      }
    });
  } finally {
    session.endSession();
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
  if (req.user.role !== 'super_admin') filter.owner = req.user._id;

  const deleted = await Booking.findOneAndDelete(filter);
  if (!deleted) return next(new ApiError('Booking not found', 404));

  res.status(200).json({
    success: true,
    message: deleted.type === 'blocked' ? 'Blocked dates deleted successfully' : 'Booking deleted successfully',
  });
};

const getAllBookings = async (req, res) => {
  const { hall, page, limit } = req.query;
  const filter = {};
  if (hall) filter.hall = hall;
  if (req.user.role !== 'super_admin') filter.owner = req.user._id;

  const result = await paginate(Booking, filter, {
    page,
    limit,
    sort: { startDate: -1 },
    populate: { path: 'hall', select: 'name' },
  });

  res.status(200).json({ success: true, ...result });
};

const getAvailabilityAdmin = async (req, res, next) => {
  const { hallId } = req.params;
  const { month } = req.query;

  const hallFilter = { _id: hallId };
  if (req.user.role !== 'super_admin') hallFilter.owner = req.user._id;

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
    const s = new Date(b.startDate);
    const e = b.endDate ? new Date(b.endDate) : new Date(s);
    let cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
    const stop = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
    while (cur <= stop) {
      blockedDates.push({
        date: cur.toISOString().split('T')[0],
        type: b.type,
        bookingId: b._id,
        _id: b._id,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  });

  res.json({ success: true, data: { bookings, blockedDates } });
};

module.exports = {
  createBooking,
  updateBooking,
  deleteBooking,
  getAvailabilityAdmin,
  getAllBookings,
};
