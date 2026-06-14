const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    foodId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    calories: {
      type: Number,
      required: true,
      default: 0,
    },
    protein: {
      type: Number,
      required: true,
      default: 0,
    },
    carbs: {
      type: Number,
      required: true,
      default: 0,
    },
    fat: {
      type: Number,
      required: true,
      default: 0,
    },
    fibre: {
      type: Number,
      required: true,
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    unit: {
      type: String,
      required: true,
      default: 'serving',
    },
  },
  { _id: false }
);

const mealLogSchema = new mongoose.Schema(
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
      index: true,
    },
    meals: {
      breakfast: {
        type: [foodItemSchema],
        default: [],
      },
      lunch: {
        type: [foodItemSchema],
        default: [],
      },
      dinner: {
        type: [foodItemSchema],
        default: [],
      },
      snacks: {
        type: [foodItemSchema],
        default: [],
      },
    },
    totalCalories: {
      type: Number,
      default: 0,
    },
    totalProtein: {
      type: Number,
      default: 0,
    },
    totalCarbs: {
      type: Number,
      default: 0,
    },
    totalFat: {
      type: Number,
      default: 0,
    },
    totalFibre: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient date + user queries
mealLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Pre-save hook to recompute totals
mealLogSchema.pre('save', function (next) {
  const allItems = [
    ...this.meals.breakfast,
    ...this.meals.lunch,
    ...this.meals.dinner,
    ...this.meals.snacks,
  ];

  this.totalCalories = allItems.reduce((sum, item) => sum + (item.calories || 0), 0);
  this.totalProtein = allItems.reduce((sum, item) => sum + (item.protein || 0), 0);
  this.totalCarbs = allItems.reduce((sum, item) => sum + (item.carbs || 0), 0);
  this.totalFat = allItems.reduce((sum, item) => sum + (item.fat || 0), 0);
  this.totalFibre = allItems.reduce((sum, item) => sum + (item.fibre || 0), 0);

  next();
});

module.exports = mongoose.model('MealLog', mealLogSchema);