const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    rollNo: {
      type: Number,
      required: [true, 'Roll number is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
      index: true,
    },
    parentName: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

studentSchema.index({ classId: 1, sectionId: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
