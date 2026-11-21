const mongoose = require('mongoose');

const subjectAllocationSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    sectionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }],
      required: [true, 'At least one Section is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one Section is required',
      },
    },
    semesters: {
      type: [Number],
      enum: { values: [1, 2], message: 'Semester must be 1 or 2' },
      default: [1, 2],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one Semester is required',
      },
    },
    // Current Main Teacher - Admin can change this
    // Changing this does NOT change already created Assignments - Snapshot rule
    // Short leave -> Share the Assignment, Long leave -> Update mainTeacherId here
    mainTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Main Teacher is required'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Teacher Dashboard - My Allocations
subjectAllocationSchema.index({ mainTeacherId: 1, isActive: 1 });
// Admin List + Overlap Check
subjectAllocationSchema.index({ classId: 1, subjectId: 1, isActive: 1 });
// Overlap Check - Only one array field (sectionIds) in index
// Do not add semesters here - Two array fields in one index causes parallel arrays error
subjectAllocationSchema.index({ subjectId: 1, classId: 1, sectionIds: 1, isActive: 1 });

module.exports = mongoose.model('SubjectAllocation', subjectAllocationSchema);
