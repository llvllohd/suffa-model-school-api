const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

sectionSchema.index({ classId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);