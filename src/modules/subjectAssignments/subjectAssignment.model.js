const mongoose = require('mongoose');

const subjectAssignmentSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
      index: true,
    },
    sectionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Section',
      required: [true, 'At least one Section is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one Section is required',
      },
    },
    semesters: {
      type: [Number],
      enum: [1, 2],
      default: [1, 2],
    },
    mainTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Main Teacher is required'],
      index: true,
    },
    sharedToTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
      index: true,
    },
    sharedUntil: {
      type: Date,
      default: null,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    categoriesOverride: {
      type: [
        {
          categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
          },
          maxMarks: {
            type: Number,
            required: true,
          },
          order: {
            type: Number,
            default: 1,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Indexes - For Fast Queries
// 1. Teacher Dashboard - My Assignments + Shared With Me
subjectAssignmentSchema.index({ mainTeacherId: 1, sharedToTeacherId: 1 });

// 2. Admin Assignment List - Class wise Subject list
subjectAssignmentSchema.index({ classId: 1, subjectId: 1 });

module.exports = mongoose.model('SubjectAssignment', subjectAssignmentSchema);
