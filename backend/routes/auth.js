const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const macroCalc = require('../utils/macroCalc');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * POST /register
 * Body: { name, email, password, gender?, height?, age?, weight?, healthGoal? }
 * Returns { token, user } — no password.
 */
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters'),
    body('email')
      .trim()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, gender, height, age, weight, healthGoal } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Calculate macro targets if all fields are present
    let macroTargets = {
      dailyCalorieTarget: 0,
      dailyProtein: 0,
      dailyCarbs: 0,
      dailyFat: 0,
      dailyFibre: 0,
    };

    if (weight && height && age && gender && healthGoal) {
      try {
        macroTargets = macroCalc({ weight, height, age, gender, goal: healthGoal });
      } catch (err) {
        // macroCalc validation failed — user will fill in via onboarding
      }
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      gender: gender || null,
      height: height || null,
      age: age || null,
      weight: weight || null,
      healthGoal: healthGoal || null,
      ...macroTargets,
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _ignored, ...userWithoutPassword } = user.toObject();
    res.status(201).json({ token, user: userWithoutPassword });
  }
);

/**
 * POST /login
 * Body: { email, password }
 * Returns { token, user } — no password.
 */
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _ignored, ...userWithoutPassword } = user.toObject();
    res.json({ token, user: userWithoutPassword });
  }
);

/**
 * GET /me
 * Requires auth middleware. Returns user profile — no password.
 */
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});

/**
 * POST /google
 * Body: { credential } — Google ID token from frontend
 * Returns { token, user }
 */
router.post('/google', async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('your-google-client-id')) {
      return res.status(500).json({ message: 'Google OAuth is not configured on the server. Set GOOGLE_CLIENT_ID in backend/.env' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        // Link existing account
        user.googleId = googleId;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      } else {
        // Create new OAuth user
        const randomPassword = require('crypto').randomBytes(32).toString('hex');
        user = await User.create({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          password: await bcrypt.hash(randomPassword, 10),
          googleId,
          avatar: picture || '',
        });
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _ignored, ...userSafe } = user.toObject();
    res.json({ token, user: userSafe });
  } catch (err) {
    next(err);
  }
});

module.exports = router;