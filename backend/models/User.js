const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      required: function() { return !this.googleId; },
      minlength: 6,
    },
    // Onboarding fields — optional at registration; onboarding step fills them in
    gender: {
      type: String,
      required: false,
      enum: ['Male', 'Female', null],
      default: null,
    },
    age: {
      type: Number,
      required: false,
      min: [10, 'Age must be at least 10'],
      max: [120, 'Age must be at most 120'],
      default: null,
    },
    height: {
      type: Number,
      required: false,
      min: [50, 'Height must be at least 50 cm'],
      max: [300, 'Height must be at most 300 cm'],
      default: null,
    },
    weight: {
      type: Number,
      required: false,
      min: [20, 'Weight must be at least 20 kg'],
      max: [500, 'Weight must be at most 500 kg'],
      default: null,
    },
    healthGoal: {
      type: String,
      required: false,
      enum: ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Clean Eating', null],
      default: null,
    },
    allergies: {
      type: [String],
      default: [],
    },
    dailyCalorieTarget: {
      type: Number,
      default: 0,
    },
    dailyProtein: {
      type: Number,
      default: 0,
    },
    dailyCarbs: {
      type: Number,
      default: 0,
    },
    dailyFat: {
      type: Number,
      default: 0,
    },
    dailyFibre: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);