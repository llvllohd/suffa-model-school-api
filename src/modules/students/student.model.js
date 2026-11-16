const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User id is required'],
      unique: true,
      index: true,
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
      minlength: [1, 'Roll number is required'],
      maxlength: [20, 'Roll number cannot exceed 20 characters'],
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
      minlength: [1, 'Parent name is required'],
      maxlength: [50, 'Parent name cannot exceed 50 characters'],
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

studentSchema.index({ classId: 1, sectionId: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
