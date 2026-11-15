const mongoose = require('mongoose');

const markSheetSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectAssignment',
      required: [true, 'Assignment is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
      index: true,
    },
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
      enum: [1, 2],
      required: [true, 'Semester is required'],
    },
    month: {
      type: String, // "2026-11"
      required: [true, 'Month is required'],
      index: true,
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
      type: [
        {
          categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
          },
          obtainedMarks: {
            type: Number,
            required: true,
            min: [0, 'Marks cannot be negative'],
          },
          maxMarks: {
            type: Number,
            required: true,
            min: [1, 'Max Marks must be at least 1'],
          },
        },
      ],
      default: [],
    },
    total: {
      type: Number,
      default: 0,
    },
    totalMax: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Unique - 1 Student = 1 Entry per Assignment per Month per Semester
markSheetSchema.index({ assignmentId: 1, studentId: 1, month: 1, semester: 1 }, { unique: true });

// Fast - Progress Report
markSheetSchema.index({ studentId: 1, month: 1 });

module.exports = mongoose.model('MarkSheet', markSheetSchema);
