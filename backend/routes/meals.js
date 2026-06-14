const express = require('express');
const { body, param, validationResult } = require('express-validator');
const MealLog = require('../models/MealLog');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Validation helpers ───────────────────────────────────────────────────────

const DATE_PARAM = param('date')
  .matches(/^\d{4}-\d{2}-\d{2}$/)
  .withMessage('Date must be in YYYY-MM-DD format');

const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

const MEAL_CATEGORY_BODY = body('mealCategory')
  .isIn(VALID_MEALS)
  .withMessage(`mealCategory must be one of: ${VALID_MEALS.join(', ')}`);

// ── Totals ───────────────────────────────────────────────────────────────────

function computeTotals(meals) {
  const allItems = [
    ...(meals?.breakfast || []),
    ...(meals?.lunch     || []),
    ...(meals?.dinner    || []),
    ...(meals?.snacks    || []),
  ];
  return {
    totalCalories: Math.round(allItems.reduce((s, i) => s + (i.calories || 0), 0) * 100) / 100,
    totalProtein:  Math.round(allItems.reduce((s, i) => s + (i.protein  || 0), 0) * 100) / 100,
    totalCarbs:    Math.round(allItems.reduce((s, i) => s + (i.carbs     || 0), 0) * 100) / 100,
    totalFat:      Math.round(allItems.reduce((s, i) => s + (i.fat       || 0), 0) * 100) / 100,
    totalFibre:    Math.round(allItems.reduce((s, i) => s + (i.fibre     || 0), 0) * 100) / 100,
  };
}

// ── GET /api/meals/:date ─────────────────────────────────────────────────────
router.get(
  '/:date',
  auth,
  [DATE_PARAM],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let doc = await MealLog.findOne({ userId: req.userId, date: req.params.date }).lean();
      if (!doc) {
        doc = await MealLog.create({
          userId: req.userId,
          date: req.params.date,
          meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFibre: 0,
        });
        return res.status(200).json(doc);
      }
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/meals/:date/add ────────────────────────────────────────────────
router.post(
  '/:date/add',
  auth,
  [
    DATE_PARAM,
    MEAL_CATEGORY_BODY,
    body('foodItem').isObject().withMessage('foodItem must be an object'),
    body('foodItem.label').notEmpty().withMessage('foodItem.label is required'),
    body('foodItem.calories').isNumeric().withMessage('foodItem.calories must be a number'),
    body('foodItem.protein').isNumeric().withMessage('foodItem.protein must be a number'),
    body('foodItem.carbs').isNumeric().withMessage('foodItem.carbs must be a number'),
    body('foodItem.fat').isNumeric().withMessage('foodItem.fat must be a number'),
    body('foodItem.fibre').isNumeric().withMessage('foodItem.fibre must be a number'),
    body('foodItem.quantity').optional().isNumeric().withMessage('foodItem.quantity must be a number'),
    body('foodItem.unit').optional().isString(),
    body('foodItem.foodId').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { date } = req.params;
      const { mealCategory, foodItem } = req.body;

      const item = {
        foodId:   foodItem.foodId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label:    foodItem.label,
        calories: Number(foodItem.calories) || 0,
        protein:  Number(foodItem.protein)  || 0,
        carbs:    Number(foodItem.carbs)    || 0,
        fat:      Number(foodItem.fat)      || 0,
        fibre:    Number(foodItem.fibre)    || 0,
        quantity: foodItem.quantity !== undefined ? Number(foodItem.quantity) : 1,
        unit:     foodItem.unit || 'serving',
      };

      const existing = await MealLog.findOne({ userId: req.userId, date }).lean();

      if (!existing) {
        const newMeals = { breakfast: [], lunch: [], dinner: [], snacks: [], [mealCategory]: [item] };
        const totals = computeTotals(newMeals);
        const doc = await MealLog.create({
          userId: req.userId,
          date,
          meals: newMeals,
          ...totals,
        });
        return res.status(201).json(doc);
      }

      // Build updated plain-meals object from existing data
      const src = existing.meals || {};
      const meals = {
        breakfast: Array.isArray(src.breakfast) ? src.breakfast.map(i => ({ ...i })) : [],
        lunch:     Array.isArray(src.lunch)     ? src.lunch.map(i => ({ ...i }))     : [],
        dinner:    Array.isArray(src.dinner)    ? src.dinner.map(i => ({ ...i }))    : [],
        snacks:    Array.isArray(src.snacks)    ? src.snacks.map(i => ({ ...i }))    : [],
      };
      if (!Array.isArray(meals[mealCategory])) meals[mealCategory] = [];
      meals[mealCategory].push(item);

      const totals = computeTotals(meals);

      const updated = await MealLog.findOneAndUpdate(
        { userId: req.userId, date },
        { $set: { meals, ...totals } },
        { new: true, lean: false }
      );

      res.status(201).json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/meals/:date/edit/:itemId ────────────────────────────────────────
router.put(
  '/:date/edit/:itemId',
  auth,
  [
    DATE_PARAM,
    param('itemId').notEmpty().withMessage('itemId is required'),
    MEAL_CATEGORY_BODY,
    body('foodItem').isObject().withMessage('foodItem must be an object'),
    body('foodItem.label').notEmpty().withMessage('foodItem.label is required'),
    body('foodItem.calories').isNumeric().withMessage('foodItem.calories must be a number'),
    body('foodItem.protein').isNumeric().withMessage('foodItem.protein must be a number'),
    body('foodItem.carbs').isNumeric().withMessage('foodItem.carbs must be a number'),
    body('foodItem.fat').isNumeric().withMessage('foodItem.fat must be a number'),
    body('foodItem.fibre').isNumeric().withMessage('foodItem.fibre must be a number'),
    body('foodItem.quantity').optional().isNumeric(),
    body('foodItem.unit').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { date, itemId } = req.params;
      const { mealCategory, foodItem } = req.body;

      const doc = await MealLog.findOne({ userId: req.userId, date }).lean();
      if (!doc) {
        return res.status(404).json({ message: 'Meal log not found for this date' });
      }

      const meals = {
        breakfast: (doc.meals?.breakfast || []).map(i => ({ ...i })),
        lunch:     (doc.meals?.lunch     || []).map(i => ({ ...i })),
        dinner:    (doc.meals?.dinner    || []).map(i => ({ ...i })),
        snacks:    (doc.meals?.snacks    || []).map(i => ({ ...i })),
      };

      const idx = meals[mealCategory].findIndex(i => i.foodId === itemId);
      if (idx === -1) {
        return res.status(404).json({ message: 'Food item not found in the specified meal category' });
      }

      const existing = meals[mealCategory][idx];
      meals[mealCategory][idx] = {
        ...existing,
        ...foodItem,
        foodId: itemId,
        calories: Number(foodItem.calories) || 0,
        protein:  Number(foodItem.protein)  || 0,
        carbs:    Number(foodItem.carbs)    || 0,
        fat:      Number(foodItem.fat)      || 0,
        fibre:    Number(foodItem.fibre)    || 0,
        quantity: foodItem.quantity !== undefined ? Number(foodItem.quantity) : existing.quantity,
        unit:     foodItem.unit || existing.unit,
      };

      const totals = computeTotals(meals);

      const updated = await MealLog.findOneAndUpdate(
        { userId: req.userId, date },
        { $set: { meals, ...totals } },
        { new: true, lean: false }
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/meals/:date/remove/:itemId ───────────────────────────────────
router.delete(
  '/:date/remove/:itemId',
  auth,
  [
    DATE_PARAM,
    param('itemId').notEmpty().withMessage('itemId is required'),
    body('mealCategory')
      .isIn(VALID_MEALS)
      .withMessage(`mealCategory must be one of: ${VALID_MEALS.join(', ')}`),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { date, itemId } = req.params;
      const { mealCategory } = req.body;

      const doc = await MealLog.findOne({ userId: req.userId, date }).lean();
      if (!doc) {
        return res.status(404).json({ message: 'Meal log not found for this date' });
      }

      const meals = {
        breakfast: (doc.meals?.breakfast || []).map(i => ({ ...i })),
        lunch:     (doc.meals?.lunch     || []).map(i => ({ ...i })),
        dinner:    (doc.meals?.dinner    || []).map(i => ({ ...i })),
        snacks:    (doc.meals?.snacks    || []).map(i => ({ ...i })),
      };

      const idx = meals[mealCategory].findIndex(i => i.foodId === itemId);
      if (idx === -1) {
        return res.status(404).json({ message: 'Food item not found in the specified meal category' });
      }

      meals[mealCategory].splice(idx, 1);

      const totals = computeTotals(meals);

      const updated = await MealLog.findOneAndUpdate(
        { userId: req.userId, date },
        { $set: { meals, ...totals } },
        { new: true, lean: false }
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;