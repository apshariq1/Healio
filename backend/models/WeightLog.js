const mongoose = require('mongoose');

const weightLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [20, 'Weight must be at least 20 kg'],
      max: [500, 'Weight must be at most 500 kg'],
    },
    bmi: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user + date queries
weightLogSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('WeightLog', weightLogSchema);