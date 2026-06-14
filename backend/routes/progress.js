const express = require('express');
const { body, validationResult } = require('express-validator');
const WeightLog = require('../models/WeightLog');
const MealLog = require('../models/MealLog');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Helper: format date as YYYY-MM-DD ───────────────────────────────────────
function toDateString(date) {
  return date.toISOString().split('T')[0];
}

// ── Helper: calculate BMI category ───────────────────────────────────────────
function bmiCategory(bmi) {
  if (bmi < 18.5)  return 'Underweight';
  if (bmi < 25)    return 'Normal';
  if (bmi < 30)    return 'Overweight';
  return 'Obese';
}

// ── POST /api/progress/weight ────────────────────────────────────────────────
router.post(
  '/weight',
  auth,
  [
    body('weight')
      .isNumeric()
      .withMessage('weight must be a number')
      .custom(v => v >= 20 && v <= 500)
      .withMessage('weight must be between 20 and 500 kg'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { weight } = req.body;

      const user = await User.findById(req.userId).lean();
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.height) {
        return res.status(400).json({ message: 'User height is not set. Please update your profile first.' });
      }

      const heightMetres = user.height / 100;
      const bmi = Math.round((weight / (heightMetres * heightMetres)) * 100) / 100;

      const today = toDateString(new Date());

      const log = await WeightLog.findOneAndUpdate(
        { userId: req.userId, date: today },
        {
          userId: req.userId,
          date:   today,
          weight: Number(weight),
          bmi,
        },
        { upsert: true, new: true, lean: false }
      );

      res.status(201).json({
        ...log.toObject(),
        bmiCategory: bmiCategory(bmi),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/progress/weight ─────────────────────────────────────────────────
router.get('/weight', auth, async (req, res, next) => {
  try {
    const entries = await WeightLog
      .find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(7)
      .lean();

    // Attach category to each entry
    const withCategory = entries.map(e => ({
      ...e,
      bmiCategory: e.bmi ? bmiCategory(e.bmi) : null,
    }));

    res.json(withCategory);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/progress/calories ───────────────────────────────────────────────
router.get('/calories', auth, async (req, res, next) => {
  try {
    const today = new Date();
    const result = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = toDateString(d);

      const mealLog = await MealLog.findOne({ userId: req.userId, date: dateStr }).lean();

      result.push({
        date: dateStr,
        calories: mealLog ? mealLog.totalCalories : 0,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/progress/streak ─────────────────────────────────────────────────
router.get('/streak', auth, async (req, res, next) => {
  try {
    const today = new Date();
    let streak = 0;

    // Check if today has any meals logged
    const todayStr = toDateString(today);
    const todayLog = await MealLog.findOne({ userId: req.userId, date: todayStr }).lean();

    const todayHasMeals = todayLog && (
      (todayLog.meals?.breakfast?.length > 0) ||
      (todayLog.meals?.lunch?.length     > 0) ||
      (todayLog.meals?.dinner?.length    > 0) ||
      (todayLog.meals?.snacks?.length    > 0)
    );

    if (!todayHasMeals) {
      // Today doesn't count; streak is 0
      return res.json({ streak: 0 });
    }

    // Today counts as the first day — count backwards
    streak = 1;
    const d = new Date(today);
    d.setDate(d.getDate() - 1); // start from yesterday

    while (true) {
      const dateStr = toDateString(d);
      const log = await MealLog.findOne({ userId: req.userId, date: dateStr }).lean();

      const hasMeals = log && (
        (log.meals?.breakfast?.length > 0) ||
        (log.meals?.lunch?.length     > 0) ||
        (log.meals?.dinner?.length    > 0) ||
        (log.meals?.snacks?.length    > 0)
      );

      if (!hasMeals) break;

      streak++;
      d.setDate(d.getDate() - 1);

      // Safety cap — don't go back more than 365 days
      if (streak > 365) break;
    }

    res.json({ streak });
  } catch (err) {
    next(err);
  }
});

module.exports = router;