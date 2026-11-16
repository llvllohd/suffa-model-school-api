const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User id is required'],
      unique: true,
      index: true,
    },
    qualification: {
      type: String,
      trim: true,
      minlength: [1, 'Qualification is required'],
      maxlength: [100, 'Qualification cannot exceed 100 characters'],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return v <= new Date();
        },
        message: 'Date of birth cannot be in future',
      },
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female'],
        message: 'Gender must be Male or Female',
      },
    },
    address: {
      type: String,
      trim: true,
      minlength: [1, 'Address is required'],
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Teacher', teacherSchema);
