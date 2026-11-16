const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      maxlength: [50, 'Class name cannot exceed 50 characters'],
      minlength: [1, 'Class name is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Class description cannot exceed 200 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ✅ Same as Category - Partial + Case-insensitive - Only active names unique, deleted can be reused
// Class 1 == class 1, Deleted Class 1 can be recreated
classSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isActive: true }, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Class', classSchema);
