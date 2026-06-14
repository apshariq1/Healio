const express = require('express');
const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const SavedRecipe = require('../models/SavedRecipe');
const MealLog = require('../models/MealLog');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Validation helpers ───────────────────────────────────────────────────────
const OBJECT_ID_PARAM = param('id')
  .isMongoId()
  .withMessage('ID must be a valid MongoDB ObjectId');

// ── GET /api/recipes/suggest ─────────────────────────────────────────────────
router.get('/suggest', auth, async (req, res, next) => {
  try {
    // We only need to check if the user is authenticated (done by auth middleware)
    // We do not need to fetch user or mealLog for macros or allergies because:
    //   - TheMealDB does not provide nutrition information, so we cannot filter by macros.
    //   - We are not using allergies to filter recipes (TheMealDB API does not support easy allergy filtering).
    //   - We will return a random set of recipes with placeholder nutrition values (0).

    // Fetch 20 random recipes from TheMealDB to have a good selection to choose from
    const recipePromises = [];
    for (let i = 0; i < 20; i++) {
      recipePromises.push(fetch('https://www.themealdb.com/api/json/v1/1/random.php'));
    }

    let responses;
    try {
      responses = await Promise.all(recipePromises);
    } catch (fetchErr) {
      console.warn('Failed to fetch random recipes from TheMealDB:', fetchErr.message);
      // If we fail to fetch, return an empty array
      return res.json([]);
    }

    // Extract meals from responses
    const meals = [];
    for (const response of responses) {
      if (!response.ok) {
        continue;
      }
      try {
        const data = await response.json();
        if (data && data.meals && Array.isArray(data.meals) && data.meals.length > 0) {
          meals.push(data.meals[0]);
        }
      } catch (parseErr) {
        console.warn('Failed to parse TheMealDB response:', parseErr.message);
        continue;
      }
    }

    // Deduplicate by idMeal
    const uniqueMealsMap = new Map();
    for (const meal of meals) {
      if (meal.idMeal && !uniqueMealsMap.has(meal.idMeal)) {
        uniqueMealsMap.set(meal.idMeal, meal);
      }
    }

    // Take up to 12 unique recipes
    const selectedMeals = Array.from(uniqueMealsMap.values()).slice(0, 12);

    // Format the recipes to match the expected structure
    const suggestedRecipes = selectedMeals.map(meal => ({
      spoonacularId: meal.idMeal, // Use TheMealDB's idMeal as the ID
      title: meal.strMeal || '',
      image: meal.strMealThumb || '',
      sourceUrl: (meal.strSource && meal.strSource.trim() !== '') ? meal.strSource :
                 (meal.strYoutube && meal.strYoutube.trim() !== '') ? meal.strYoutube : '',
      calories: 0, // TheMealDB does not provide nutrition information
      protein: 0,
      carbs: 0,
      fat: 0
    }));

    // Return the formatted recipes (array)
    res.json(suggestedRecipes);
  } catch (err) {
    console.warn('Error in recipe suggestions:', err.message);
    // Fallback to empty array on any error
    return res.json([]);
  }
});

// ── POST /api/recipes/save ───────────────────────────────────────────────────
router.post(
  '/save',
  auth,
  [
    body('spoonacularId').isNumeric().withMessage('spoonacularId must be a number'),
    body('title').notEmpty().trim().withMessage('title is required'),
    body('image').optional().isString(),
    body('sourceUrl').optional().isString(),
    body('calories').optional().toFloat().isFloat(),
    body('protein').optional().toFloat().isFloat(),
    body('carbs').optional().toFloat().isFloat(),
    body('fat').optional().toFloat().isFloat(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { spoonacularId, title, image, sourceUrl, calories, protein, carbs, fat } = req.body;

      const saved = await SavedRecipe.findOneAndUpdate(
        { userId: req.userId, recipeId: Number(spoonacularId) },
        {
          userId:     req.userId,
          recipeId:   Number(spoonacularId),
          title,
          image:      image      || '',
          sourceUrl:  sourceUrl  || '',
          calories:   Number(calories) || 0,
          protein:    Number(protein)  || 0,
          carbs:      Number(carbs)    || 0,
          fat:        Number(fat)      || 0,
        },
        { upsert: true, new: true, lean: false }
      );

      res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/recipes/saved ───────────────────────────────────────────────────
router.get('/saved', auth, async (req, res, next) => {
  try {
    const recipes = await SavedRecipe
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/recipes/saved/:id ────────────────────────────────────────────
router.delete('/saved/:id', auth, [OBJECT_ID_PARAM], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const deleted = await SavedRecipe.findOneAndDelete({
      _id:     req.params.id,
      userId:  req.userId,
    }).lean();

    if (!deleted) {
      return res.status(404).json({ message: 'Saved recipe not found' });
    }

    res.json({ message: 'Recipe removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;