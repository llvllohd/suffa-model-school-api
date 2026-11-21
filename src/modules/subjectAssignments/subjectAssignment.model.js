const mongoose = require('mongoose');

const subjectAssignmentSchema = new mongoose.Schema(
  {
    // Parent Allocation - Subject / Class / Section / Semester comes from here
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectAllocation',
      required: [true, 'Allocation is required'],
    },
    // Semester of this Assignment - 1 or 2
    // Must be inside allocation.semesters - e.g. Allocation [1] can only create Sem 1 Assignment
    // Rare case: Sem 1 Teacher X, Sem 2 Teacher Y -> 2 Allocations with semesters [1] and [2]
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      enum: { values: [1, 2], message: 'Semester must be 1 or 2' },
    },
    // Calendar Month - 1 to 12 - 1 = Jan, 6 = Jun, 12 = Dec
    // Direct mapping - monthLabel is derived from this, no need to store separately
    calendarMonth: {
      type: Number,
      required: [true, 'Calendar Month is required'],
      min: [1, 'Calendar Month must be at least 1'],
      max: [12, 'Calendar Month cannot exceed 12'],
    },
    // Academic Year - e.g. 2026, 2027
    // Academic Year = Year selected in Year dropdown - e.g. Jan 2027 -> academicYear 2027
    // Allocation is reusable - Same Allocation can have Assignment for 2026 AND 2027
    // One Assignment per Allocation + Semester + Calendar Month + Year
    academicYear: {
      type: Number,
      required: [true, 'Academic Year is required'],
      min: [2000, 'Academic Year is invalid'],
      max: [2100, 'Academic Year is invalid'],
    },
    // SNAPSHOT - Teacher at creation time - Allocation change does not affect this
    mainTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Main Teacher is required'],
    },
    sharedToTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    sharedUntil: { type: Date, default: null },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    categoriesOverride: {
      type: [
        {
          categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category id is required'] },
          maxMarks: {
            type: Number,
            required: [true, 'Max Marks is required'],
            min: [1, 'Max Marks must be at least 1'],
            max: [1000, 'Max Marks cannot exceed 1000'],
          },
          order: { type: Number, required: [true, 'Order is required'], min: [1, 'Order must be at least 1'] },
          _id: false,
        },
      ],
      default: [],
    },
    removedCategoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      default: [],
    },
    // Completed Assignments are locked - No Teacher / Share / Category change
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

subjectAssignmentSchema.index({ mainTeacherId: 1, isActive: 1 });
subjectAssignmentSchema.index({ sharedToTeacherId: 1, isActive: 1 });
subjectAssignmentSchema.index({ allocationId: 1, isActive: 1 });
subjectAssignmentSchema.index({ academicYear: 1, mainTeacherId: 1, isActive: 1 });
// One Assignment per Allocation + Semester + Calendar Month + Year - Allocation reusable across years
subjectAssignmentSchema.index(
  { allocationId: 1, semester: 1, calendarMonth: 1, academicYear: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

module.exports = mongoose.model('SubjectAssignment', subjectAssignmentSchema);
