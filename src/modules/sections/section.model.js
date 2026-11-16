const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class id is required'],
    },
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      maxlength: [20, 'Section name cannot exceed 20 characters'],
      minlength: [1, 'Section name is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ✅ Compound Unique - Same name allowed in different Class, not in same Class
// Class 1 - A ✅, Class 1 - A ❌, Class 2 - A ✅
sectionSchema.index({ classId: 1, name: 1 }, { unique: true, partialFilterExpression: { isActive: true }, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Section', sectionSchema);
