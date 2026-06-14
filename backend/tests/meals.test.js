// Mock connectDB before requiring anything else.
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

jest.setTimeout(60000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const MealLog = require('../models/MealLog');

let mongoServer;
let authToken;

const VALID_USER = {
  name: 'Dana',
  email: 'dana@example.com',
  password: 'password123',
  gender: 'Female',
  height: 160,
  age: 25,
  weight: 55,
  healthGoal: 'Maintenance',
};

const TEST_DATE = '2025-06-01';

const SAMPLE_FOOD = {
  foodId: 'food_123',
  label: 'Banana',
  calories: 89,
  protein: 1.1,
  carbs: 22.8,
  fat: 0.3,
  fibre: 2.6,
  quantity: 1,
  unit: 'serving',
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
  await MealLog.deleteMany({});

  const res = await request(app)
    .post('/api/auth/register')
    .send(VALID_USER);
  authToken = res.body.token;
});

describe('GET /api/meals/:date', () => {
  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .get('/api/meals/01-06-2025')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'date')).toBe(true);
  });

  it('creates an empty MealLog when none exists for the user/date', async () => {
    const res = await request(app)
      .get(`/api/meals/${TEST_DATE}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(TEST_DATE);
    expect(res.body.meals.breakfast).toEqual([]);
    expect(res.body.totalCalories).toBe(0);
  });

  it('returns existing MealLog when one already exists', async () => {
    // Pre-create a log
    await MealLog.create({
      userId: (await User.findOne({ email: VALID_USER.email }))._id,
      date: TEST_DATE,
      meals: { breakfast: [SAMPLE_FOOD], lunch: [], dinner: [], snacks: [] },
      totalCalories: SAMPLE_FOOD.calories,
      totalProtein:  SAMPLE_FOOD.protein,
      totalCarbs:    SAMPLE_FOOD.carbs,
      totalFat:      SAMPLE_FOOD.fat,
      totalFibre:    SAMPLE_FOOD.fibre,
    });

    const res = await request(app)
      .get(`/api/meals/${TEST_DATE}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meals.breakfast).toHaveLength(1);
    expect(res.body.meals.breakfast[0].label).toBe('Banana');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get(`/api/meals/${TEST_DATE}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/meals/:date/add', () => {
  it('adds a food item to the specified meal category and updates totals', async () => {
    const res = await request(app)
      .post(`/api/meals/${TEST_DATE}/add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'breakfast', foodItem: SAMPLE_FOOD });

    expect(res.status).toBe(201);
    expect(res.body.meals.breakfast).toHaveLength(1);
    expect(res.body.meals.breakfast[0].label).toBe('Banana');
    expect(res.body.totalCalories).toBe(SAMPLE_FOOD.calories);
  });

  it('creates MealLog with empty meals if not found before adding', async () => {
    const res = await request(app)
      .post(`/api/meals/${TEST_DATE}/add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'lunch', foodItem: { ...SAMPLE_FOOD, label: 'Lunch Item' } });

    expect(res.status).toBe(201);
    expect(res.body.meals.lunch).toHaveLength(1);
    expect(res.body.totalCalories).toBe(SAMPLE_FOOD.calories);
  });

  it('assigns a generated foodId when not provided', async () => {
    const { foodId, ...itemWithoutId } = SAMPLE_FOOD;
    const res = await request(app)
      .post(`/api/meals/${TEST_DATE}/add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'snacks', foodItem: itemWithoutId });

    expect(res.status).toBe(201);
    expect(res.body.meals.snacks[0].foodId).toMatch(/^local-\d+-/);
  });

  it('returns 400 for invalid mealCategory', async () => {
    const res = await request(app)
      .post(`/api/meals/${TEST_DATE}/add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'supper', foodItem: SAMPLE_FOOD });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'mealCategory')).toBe(true);
  });

  it('returns 400 when foodItem is missing required fields', async () => {
    const res = await request(app)
      .post(`/api/meals/${TEST_DATE}/add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'breakfast', foodItem: { label: 'No nutrition' } });

    expect(res.status).toBe(400);
  });

  it('adds multiple items to different categories and sums totals', async () => {
    await request(app)
      .post(`/api/meals/${TEST_DATE}/add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'breakfast', foodItem: SAMPLE_FOOD });

    const res = await request(app)
      .post(`/api/meals/${TEST_DATE}/add`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mealCategory: 'lunch',
        foodItem: { ...SAMPLE_FOOD, label: 'Lunch Banana', foodId: 'food_456' },
      });

    expect(res.status).toBe(201);
    expect(res.body.meals.breakfast).toHaveLength(1);
    expect(res.body.meals.lunch).toHaveLength(1);
    expect(res.body.totalCalories).toBeCloseTo(SAMPLE_FOOD.calories * 2, 0);
  });
});

describe('PUT /api/meals/:date/edit/:itemId', () => {
  beforeEach(async () => {
    // Pre-create a log with one item
    const user = await User.findOne({ email: VALID_USER.email });
    await MealLog.create({
      userId: user._id,
      date: TEST_DATE,
      meals: { breakfast: [SAMPLE_FOOD], lunch: [], dinner: [], snacks: [] },
      totalCalories: SAMPLE_FOOD.calories,
      totalProtein:  SAMPLE_FOOD.protein,
      totalCarbs:    SAMPLE_FOOD.carbs,
      totalFat:      SAMPLE_FOOD.fat,
      totalFibre:    SAMPLE_FOOD.fibre,
    });
  });

  it('edits a food item by its foodId', async () => {
    const res = await request(app)
      .put(`/api/meals/${TEST_DATE}/edit/${SAMPLE_FOOD.foodId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mealCategory: 'breakfast',
        foodItem: { ...SAMPLE_FOOD, label: 'Updated Banana', calories: 100 },
      });

    expect(res.status).toBe(200);
    expect(res.body.meals.breakfast[0].label).toBe('Updated Banana');
    expect(res.body.meals.breakfast[0].calories).toBe(100);
  });

  it('recalculates totals after editing', async () => {
    const res = await request(app)
      .put(`/api/meals/${TEST_DATE}/edit/${SAMPLE_FOOD.foodId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mealCategory: 'breakfast',
        foodItem: { ...SAMPLE_FOOD, calories: 200, protein: 5 },
      });

    expect(res.status).toBe(200);
    expect(res.body.totalCalories).toBe(200);
    expect(res.body.totalProtein).toBe(5);
  });

  it('returns 404 when food item not found in the category', async () => {
    const res = await request(app)
      .put(`/api/meals/${TEST_DATE}/edit/not-a-real-id`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'breakfast', foodItem: SAMPLE_FOOD });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });

  it('returns 404 when meal log does not exist', async () => {
    const res = await request(app)
      .put('/api/meals/2099-01-01/edit/food_123')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'breakfast', foodItem: SAMPLE_FOOD });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/meals/:date/remove/:itemId', () => {
  beforeEach(async () => {
    const user = await User.findOne({ email: VALID_USER.email });
    await MealLog.create({
      userId: user._id,
      date: TEST_DATE,
      meals: { breakfast: [SAMPLE_FOOD], lunch: [], dinner: [], snacks: [] },
      totalCalories: SAMPLE_FOOD.calories,
      totalProtein:  SAMPLE_FOOD.protein,
      totalCarbs:    SAMPLE_FOOD.carbs,
      totalFat:      SAMPLE_FOOD.fat,
      totalFibre:    SAMPLE_FOOD.fibre,
    });
  });

  it('removes a food item and resets totals to zero', async () => {
    const res = await request(app)
      .delete(`/api/meals/${TEST_DATE}/remove/${SAMPLE_FOOD.foodId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'breakfast' });

    expect(res.status).toBe(200);
    expect(res.body.meals.breakfast).toHaveLength(0);
    expect(res.body.totalCalories).toBe(0);
  });

  it('returns 404 when food item not found', async () => {
    const res = await request(app)
      .delete(`/api/meals/${TEST_DATE}/remove/not-a-real-id`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'breakfast' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid mealCategory', async () => {
    const res = await request(app)
      .delete(`/api/meals/${TEST_DATE}/remove/${SAMPLE_FOOD.foodId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mealCategory: 'brunch' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .delete(`/api/meals/${TEST_DATE}/remove/${SAMPLE_FOOD.foodId}`)
      .send({ mealCategory: 'breakfast' });

    expect(res.status).toBe(401);
  });
});