const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['INCOME', 'EXPENSE'],
        message: '{VALUE} is not supported. Type must be INCOME or EXPENSE',
      },
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['CASH', 'UPI', 'BANK', 'CARD', 'OTHER'],
        message: '{VALUE} is not a valid payment method',
      },
      default: 'CASH',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
  },
  { timestamps: true },
);

transactionSchema.index({ owner: 1, date: -1 });
transactionSchema.index({ owner: 1, type: 1, date: -1 });
transactionSchema.index({ owner: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
