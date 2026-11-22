const mongoose = require('mongoose');

const teacherAttendanceRecordSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    status: {
      type: String,
      enum: { values: ['Present', 'Absent'], message: 'Status must be Present or Absent' },
      default: 'Present',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
);

const teacherAttendanceSchema = new mongoose.Schema(
  {
    // Format: "2026-11-22"
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    takenByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin is required'],
    },
    records: {
      type: [teacherAttendanceRecordSchema],
      required: [true, 'Records are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one attendance record is required',
      },
    },
    totalPresent: { type: Number, default: 0 },
    totalAbsent: { type: Number, default: 0 },
    // No isActive here - Attendance is history, never deactivate or delete
  },
  { timestamps: true },
);

// 1 Day = 1 Entry - also serves monthly summary (date prefix)
teacherAttendanceSchema.index({ date: 1 }, { unique: true });

teacherAttendanceSchema.pre('save', function () {
  this.totalPresent = this.records.filter((r) => r.status === 'Present').length;
  this.totalAbsent = this.records.filter((r) => r.status === 'Absent').length;
});

module.exports = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
