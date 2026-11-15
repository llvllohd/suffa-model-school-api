const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      unique: true,
      trim: true,
    },
    defaultCategories: {
      type: [
        {
          categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
          },
          maxMarks: {
            type: Number,
            required: [true, 'Max Marks is required'],
            min: [1, 'Max Marks must be at least 1'],
          },
          order: {
            type: Number,
            default: 1,
          },
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

module.exports = mongoose.model('Subject', subjectSchema);
