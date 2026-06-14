const mongoose = require('mongoose');

const savedRecipeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipeId: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    calories: {
      type: Number,
      default: 0,
    },
    protein: {
      type: Number,
      default: 0,
    },
    carbs: {
      type: Number,
      default: 0,
    },
    fat: {
      type: Number,
      default: 0,
    },
    servings: {
      type: Number,
      default: 1,
    },
    readyInMinutes: {
      type: Number,
      default: 0,
    },
    sourceUrl: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    dishTypes: {
      type: [String],
      default: [],
    },
    cuisines: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate saves
savedRecipeSchema.index({ userId: 1, recipeId: 1 }, { unique: true });

module.exports = mongoose.model('SavedRecipe', savedRecipeSchema);