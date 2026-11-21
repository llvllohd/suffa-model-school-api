const mongoose = require('mongoose');

// Same normalize as user.model.js - Store always as 10-digit
const normalizePhone = (phone) => {
  if (!phone) return phone;
  let p = phone.replace(/[\s-]/g, '');
  if (p.startsWith('+91')) p = p.slice(3);
  if (p.startsWith('91') && p.length === 12) p = p.slice(2);
  return p;
};

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User id is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    rollNumber: {
      type: Number,
      required: [true, 'Roll Number is required'],
      min: [1, 'Roll Number must be at least 1'],
    },
    admissionNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Admission Number cannot exceed 20 characters'],
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
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    guardianName: {
      type: String,
      trim: true,
      maxlength: [50, 'Guardian Name cannot exceed 50 characters'],
    },
    guardianPhone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Guardian Phone must be a valid 10-digit Indian number'],
    },
  },
  { timestamps: true },
);

// Normalize guardianPhone before save - Same as User.phone
studentSchema.pre('save', function (next) {
  if (this.isModified('guardianPhone') && this.guardianPhone) {
    this.guardianPhone = normalizePhone(this.guardianPhone);
  }
  next();
});

// Same Class + Same Section me Roll Number unique - Deleted (User inactive) wale reuse ho sakte hai
// So no unique index here - Roll check in controller with User.isActive
studentSchema.index({ classId: 1, sectionId: 1, rollNumber: 1 });
studentSchema.index({ userId: 1 }, { unique: true });
studentSchema.index({ admissionNumber: 1 }, { unique: true, sparse: true, partialFilterExpression: { admissionNumber: { $type: 'string' } } });

module.exports = mongoose.model('Student', studentSchema);
