// Mock connectDB before requiring anything else.
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

jest.setTimeout(60000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const WeightLog = require('../models/WeightLog');
const MealLog = require('../models/MealLog');

let mongoServer;
let authToken;

const VALID_USER = {
  name: 'Carol Tester',
  email: 'carol@example.com',
  password: 'password123',
  gender: 'Female',
  height: 170,
  age: 25,
  weight: 65,
  healthGoal: 'Maintenance',
  dailyCalorieTarget: 1800,
  dailyProtein: 140,
  dailyCarbs: 180,
  dailyFat: 60,
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await WeightLog.deleteMany({});
  await MealLog.deleteMany({});

  const res = await request(app)
    .post('/api/auth/register')
    .send(VALID_USER);
  authToken = res.body.token;
});

// Helper: date string for N days ago (N=0 is today)
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── POST /api/progress/weight ────────────────────────────────────────────────

describe('POST /api/progress/weight', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/progress/weight')
      .send({ weight: 70 });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing weight', async () => {
    const res = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for weight outside 20–500 kg', async () => {
    const res = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 10 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when user height is not set', async () => {
    // Register user without height
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'NoHeight', email: 'noheight@example.com', password: 'pass123' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noheight@example.com', password: 'pass123' });

    const res = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ weight: 70 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/height/i);
  });

  it('logs weight and calculates BMI correctly', async () => {
    // User: height=170, weight=65 → BMI = 65/(1.7^2) = 22.49...
    const res = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 70 });

    expect(res.status).toBe(201);
    expect(res.body.weight).toBe(70);
    expect(res.body.bmi).toBeCloseTo(24.21, 1);
    expect(res.body.bmiCategory).toBe('Normal');
  });

  it('calculates correct BMI category: Underweight', async () => {
    const res = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 50 }); // BMI ≈ 17.3
    expect(res.body.bmiCategory).toBe('Underweight');
  });

  it('calculates correct BMI category: Overweight', async () => {
    const res = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 85 }); // BMI ≈ 29.4
    expect(res.body.bmiCategory).toBe('Overweight');
  });

  it('calculates correct BMI category: Obese', async () => {
    const res = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 100 }); // BMI ≈ 34.6
    expect(res.body.bmiCategory).toBe('Obese');
  });

  it('upserts weight for today (same day updates, not creates)', async () => {
    // First log
    await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 70 });

    // Second log on same day should upsert
    const updateRes = await request(app)
      .post('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 71 });

    expect(updateRes.status).toBe(201);
    expect(updateRes.body.weight).toBe(71);

    const today = new Date().toISOString().split('T')[0];
    const todayLogs = await WeightLog.find({ userId: updateRes.body.userId, date: today }).lean();
    expect(todayLogs.length).toBe(1); // only one entry for today
    expect(todayLogs[0].weight).toBe(71);
  });
});

// ── GET /api/progress/weight ─────────────────────────────────────────────────

describe('GET /api/progress/weight', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/progress/weight');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no weight logs exist', async () => {
    const res = await request(app)
      .get('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('returns last 7 weight logs sorted by date descending', async () => {
    for (let i = 0; i < 10; i++) {
      await WeightLog.create({
        userId: (await User.findOne({ email: VALID_USER.email }))._id,
        date: daysAgo(i),
        weight: 60 + i,
        bmi: 22,
      });
    }

    const res = await request(app)
      .get('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(7);
    expect(res.body[0].date).toBe(daysAgo(0)); // most recent first
    expect(res.body[6].date).toBe(daysAgo(6));
  });

  it('attaches bmiCategory to each entry', async () => {
    const user = await User.findOne({ email: VALID_USER.email });
    await WeightLog.create({
      userId: user._id,
      date: daysAgo(0),
      weight: 70,
      bmi: 24.2,
    });

    const res = await request(app)
      .get('/api/progress/weight')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.body[0].bmiCategory).toBe('Normal');
  });
});

// ── GET /api/progress/calories ───────────────────────────────────────────────

describe('GET /api/progress/calories', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/progress/calories');
    expect(res.status).toBe(401);
  });

  it('returns 7 entries (today through 6 days ago)', async () => {
    const res = await request(app)
      .get('/api/progress/calories')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(7);
    expect(res.body[0].date).toBe(daysAgo(0));
    expect(res.body[6].date).toBe(daysAgo(6));
  });

  it('shows 0 calories for dates with no meal log', async () => {
    const res = await request(app)
      .get('/api/progress/calories')
      .set('Authorization', `Bearer ${authToken}`);
    res.body.forEach(entry => {
      expect(entry.calories).toBe(0);
    });
  });

  it('shows correct calories for dates with meal logs', async () => {
    const user = await User.findOne({ email: VALID_USER.email });

    // Log meals for 3 days ago — use findOneAndUpdate to bypass pre-save hook
    await MealLog.findOneAndUpdate(
      { userId: user._id, date: daysAgo(3) },
      {
        userId: user._id,
        date: daysAgo(3),
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
        totalCalories: 1500,
        totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFibre: 0,
      },
      { upsert: true }
    );

    const res = await request(app)
      .get('/api/progress/calories')
      .set('Authorization', `Bearer ${authToken}`);

    const day3 = res.body.find(e => e.date === daysAgo(3));
    expect(day3.calories).toBe(1500);
  });
});

// ── GET /api/progress/streak ─────────────────────────────────────────────────

describe('GET /api/progress/streak', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/progress/streak');
    expect(res.status).toBe(401);
  });

  it('returns streak 0 when today has no meals', async () => {
    const res = await request(app)
      .get('/api/progress/streak')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.streak).toBe(0);
  });

  it('returns streak 1 when only today has meals', async () => {
    const user = await User.findOne({ email: VALID_USER.email });
    await MealLog.create({
      userId: user._id,
      date: daysAgo(0),
      meals: {
        breakfast: [{ foodId: 'f1', label: 'Egg', calories: 100, protein: 10, carbs: 1, fat: 5, fibre: 0, quantity: 1, unit: 'serving' }],
        lunch: [], dinner: [], snacks: [],
      },
      totalCalories: 100,
      totalProtein: 10, totalCarbs: 1, totalFat: 5, totalFibre: 0,
    });

    const res = await request(app)
      .get('/api/progress/streak')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.body.streak).toBe(1);
  });

  it('counts consecutive days with meals', async () => {
    const user = await User.findOne({ email: VALID_USER.email });

    // Create meal logs for today, yesterday, and the day before
    for (let i = 0; i <= 2; i++) {
      await MealLog.create({
        userId: user._id,
        date: daysAgo(i),
        meals: {
          breakfast: [{ foodId: `f${i}`, label: 'Toast', calories: 200, protein: 5, carbs: 30, fat: 5, fibre: 2, quantity: 1, unit: 'serving' }],
          lunch: [], dinner: [], snacks: [],
        },
        totalCalories: 200,
        totalProtein: 5, totalCarbs: 30, totalFat: 5, totalFibre: 2,
      });
    }

    const res = await request(app)
      .get('/api/progress/streak')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.body.streak).toBe(3);
  });

  it('breaks streak when a day has empty meals array', async () => {
    const user = await User.findOne({ email: VALID_USER.email });

    // today has meals
    await MealLog.create({
      userId: user._id,
      date: daysAgo(0),
      meals: { breakfast: [{ foodId: 'f0', label: 'Egg', calories: 100, protein: 10, carbs: 1, fat: 5, fibre: 0, quantity: 1, unit: 'serving' }], lunch: [], dinner: [], snacks: [] },
      totalCalories: 100, totalProtein: 10, totalCarbs: 1, totalFat: 5, totalFibre: 0,
    });

    // yesterday has meals
    await MealLog.create({
      userId: user._id,
      date: daysAgo(1),
      meals: { breakfast: [{ foodId: 'f1', label: 'Egg', calories: 100, protein: 10, carbs: 1, fat: 5, fibre: 0, quantity: 1, unit: 'serving' }], lunch: [], dinner: [], snacks: [] },
      totalCalories: 100, totalProtein: 10, totalCarbs: 1, totalFat: 5, totalFibre: 0,
    });

    // day before yesterday has empty meals array (created but no food)
    await MealLog.create({
      userId: user._id,
      date: daysAgo(2),
      meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
      totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFibre: 0,
    });

    const res = await request(app)
      .get('/api/progress/streak')
      .set('Authorization', `Bearer ${authToken}`);
    // today and yesterday count (2); day before yesterday breaks it
    expect(res.body.streak).toBe(2);
  });
});