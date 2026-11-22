const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
      minlength: [2, 'Category name must be at least 2 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Partial + Case-insensitive - Only active names are unique, deleted names can be reused
// Quiz == quiz, Deleted Quiz can be recreated
categorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isActive: true }, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Category', categorySchema);
