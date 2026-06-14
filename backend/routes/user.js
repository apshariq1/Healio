const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const macroCalc = require('../utils/macroCalc');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Recompute macro targets from user document fields and update the document. */
async function recalcAndSave(user) {
  if (!user.weight || !user.height || !user.age || !user.gender || !user.healthGoal) {
    // Cannot recalculate without full profile; just save as-is
    await user.save();
    return user;
  }
  const targets = macroCalc({
    weight: user.weight,
    height: user.height,
    age: user.age,
    gender: user.gender,
    goal: user.healthGoal,
  });
  user.dailyCalorieTarget = targets.dailyCalorieTarget;
  user.dailyProtein       = targets.dailyProtein;
  user.dailyCarbs         = targets.dailyCarbs;
  user.dailyFat           = targets.dailyFat;
  user.dailyFibre         = targets.dailyFibre;
  await user.save();
  return user;
}

// ── PUT /api/user/profile ─────────────────────────────────────────────────────
/**
 * Update name, weight, height, age, gender.
 * If any field that affects macros changes, recalculate macro targets.
 * Body: { name?, weight?, height?, age?, gender? }
 */
router.put(
  '/profile',
  auth,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty')
      .isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters'),
    body('weight')
      .optional()
      .isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20 and 500 kg'),
    body('height')
      .optional()
      .isFloat({ min: 50, max: 300 }).withMessage('Height must be between 50 and 300 cm'),
    body('age')
      .optional()
      .isInt({ min: 10, max: 120 }).withMessage('Age must be between 10 and 120'),
    body('gender')
      .optional()
      .isIn(['Male', 'Female']).withMessage('Gender must be "Male" or "Female"'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const { name, weight, height, age, gender } = req.body;

      // Track whether any macro-affecting field changed
      const macroFields = ['weight', 'height', 'age', 'gender'];
      const macroChanged = macroFields.some(
        f => req.body[f] !== undefined && req.body[f] !== user[f]
      );

      // Apply updates
      if (name     !== undefined) user.name     = name;
      if (weight   !== undefined) user.weight   = weight;
      if (height   !== undefined) user.height   = height;
      if (age      !== undefined) user.age      = age;
      if (gender   !== undefined) user.gender   = gender;

      const updated = await recalcAndSave(user);

      const { password: _pw, ...userSafe } = updated.toObject();
      res.json(userSafe);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/user/goal ────────────────────────────────────────────────────────
/**
 * Update healthGoal and recalculate macro targets.
 * Body: { healthGoal: 'Weight Loss' | 'Muscle Gain' | 'Maintenance' | 'Clean Eating' }
 */
router.put(
  '/goal',
  auth,
  [
    body('healthGoal')
      .isIn(['Weight Loss', 'Muscle Gain', 'Maintenance', 'Clean Eating'])
      .withMessage('healthGoal must be one of: Weight Loss, Muscle Gain, Maintenance, Clean Eating'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.healthGoal = req.body.healthGoal;

      const updated = await recalcAndSave(user);

      const { password: _pw, ...userSafe } = updated.toObject();
      res.json(userSafe);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/user/allergies ───────────────────────────────────────────────────
/**
 * Replace the user's allergies array.
 * Body: { allergies: string[] }
 */
router.put(
  '/allergies',
  auth,
  [
    body('allergies')
      .isArray().withMessage('allergies must be an array'),
    body('allergies.*')
      .isString().withMessage('Each allergy must be a string')
      .trim()
      .notEmpty().withMessage('Allergy string cannot be empty'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.allergies = req.body.allergies;
      await user.save();

      const { password: _pw, ...userSafe } = user.toObject();
      res.json(userSafe);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;