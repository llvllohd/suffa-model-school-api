const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [30, 'Category name cannot exceed 30 characters'],
      set: (v) => v?.trim().toLowerCase(),
    },
    type: {
      type: String,
      required: [true, 'Category type is required'],
      enum: {
        values: ['INCOME', 'EXPENSE'],
        message: 'Type must be either INCOME or EXPENSE',
      },
    },
    icon: {
      type: String,
      trim: true,
      default: '💰',
    },
    color: {
      type: String,
      default: '#10B981',
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^#([0-9A-F]{3}){1,2}$/i.test(v);
        },
        message: 'Color must be a valid hex code',
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true,
    },
  },
  { timestamps: true },
);

categorySchema.index({ owner: 1, name: 1, type: 1 }, { unique: true });
categorySchema.index({ owner: 1, type: 1 });

categorySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const set = update.$set || update;
  if (set.name) {
    const lower = set.name.trim().toLowerCase();
    set.name = lower;
    if (update.$set) update.$set.name = lower;
    else update.name = lower;
  }
  this.setUpdate(update);
  next();
});

module.exports = mongoose.model('Category', categorySchema);
