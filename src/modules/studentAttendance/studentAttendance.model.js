const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
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

const studentAttendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    // Format: "2026-11-14"
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    takenByTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    records: {
      type: [attendanceRecordSchema],
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

// 1 Class + 1 Section + 1 Day = 1 Entry - also serves monthly summary (date prefix)
studentAttendanceSchema.index({ classId: 1, sectionId: 1, date: 1 }, { unique: true });

studentAttendanceSchema.pre('save', function () {
  this.totalPresent = this.records.filter((r) => r.status === 'Present').length;
  this.totalAbsent = this.records.filter((r) => r.status === 'Absent').length;
});

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);
