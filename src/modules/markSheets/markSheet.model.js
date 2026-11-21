const mongoose = require('mongoose');

const markEntrySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    obtainedMarks: {
      type: Number,
      required: [true, 'Obtained marks is required'],
      min: [0, 'Obtained marks cannot be negative'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
      min: [1, 'Max marks must be at least 1'],
    },
  },
  { _id: false },
);

const markSheetSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectAssignment',
      required: [true, 'Assignment is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    // Snapshot from student at entry time - for fast Progress Report
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
    semester: {
      type: Number,
      enum: { values: [1, 2], message: 'Semester must be 1 or 2' },
      required: [true, 'Semester is required'],
    },
    // Format: "2026-11" - derived from assignment calendarMonth + academicYear
    // Named monthKey because it holds month + year, not just month
    monthKey: {
      type: String,
      required: [true, 'Month key is required'],
    },
    enteredByTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    marks: {
      type: [markEntrySchema],
      required: [true, 'Marks are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one mark entry is required',
      },
    },
    total: { type: Number, default: 0 },
    totalMax: { type: Number, default: 0 },
    // No isActive here - Marks are history, never deactivate or delete
  },
  { timestamps: true },
);

// 1 Student = 1 Entry per Assignment per Month
markSheetSchema.index({ assignmentId: 1, studentId: 1, monthKey: 1, semester: 1 }, { unique: true });
// For Progress Report fast - studentId + monthKey
markSheetSchema.index({ studentId: 1, monthKey: 1 });
// Teacher Dashboard - assignments by teacher
markSheetSchema.index({ enteredByTeacherId: 1, createdAt: -1 });

markSheetSchema.pre('save', function () {
  this.total = this.marks.reduce((sum, m) => sum + (m.obtainedMarks || 0), 0);
  this.totalMax = this.marks.reduce((sum, m) => sum + (m.maxMarks || 0), 0);
});

module.exports = mongoose.model('MarkSheet', markSheetSchema);
