const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      minlength: [2, 'Subject name must be at least 2 characters'],
      maxlength: [50, 'Subject name cannot exceed 50 characters'],
    },
    defaultCategories: {
      type: [
        {
          categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category id is required'],
          },
          maxMarks: {
            type: Number,
            required: [true, 'Max Marks is required'],
            min: [1, 'Max Marks must be at least 1'],
            max: [1000, 'Max Marks cannot exceed 1000'],
          },
          order: {
            type: Number,
            required: [true, 'Order is required'],
            min: [1, 'Order must be at least 1'],
          },
          _id: false,
        },
      ],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Same as Category / Class - Partial + Case-insensitive - Only active names unique, deleted can be reused
// Example: English == english, a deleted English can be recreated
subjectSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isActive: true }, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Subject', subjectSchema);
