// Mock connectDB before requiring anything else.
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

jest.setTimeout(60000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const SavedRecipe = require('../models/SavedRecipe');
const MealLog = require('../models/MealLog');

let mongoServer;
let authToken;

const VALID_USER = {
  name: 'Bob Builder',
  email: 'bob@example.com',
  password: 'password123',
  gender: 'Male',
  height: 180,
  age: 30,
  weight: 80,
  healthGoal: 'Maintenance',
  dailyCalorieTarget: 2000,
  dailyProtein: 150,
  dailyCarbs: 200,
  dailyFat: 70,
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
  await SavedRecipe.deleteMany({});
  await MealLog.deleteMany({});

  const res = await request(app)
    .post('/api/auth/register')
    .send(VALID_USER);
  authToken = res.body.token;
});

// ── GET /api/recipes/suggest ─────────────────────────────────────────────────

describe('GET /api/recipes/suggest', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/recipes/suggest');
    expect(res.status).toBe(401);
  });

  it('returns 200 with demo recipes when Edamam credentials are not configured', async () => {
    // Temporarily clear the Edamam env vars
    const originalAppId = process.env.EDAMAM_RECIPE_APP_ID;
    const originalAppKey = process.env.EDAMAM_RECIPE_APP_KEY;
    delete process.env.EDAMAM_RECIPE_APP_ID;
    delete process.env.EDAMAM_RECIPE_APP_KEY;

    // Mock fetch so the test does not make real HTTP calls to TheMealDB
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        meals: [
          {
            idMeal: '52772',
            strMeal: 'Mock Demo Recipe',
            strMealThumb: 'https://mock.example.com/image.jpg',
            strSource: 'https://mock.example.com/recipe',
          },
        ],
      }),
    });

    const res = await request(app)
      .get('/api/recipes/suggest')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Mock Demo Recipe');

    // Restore
    global.fetch = originalFetch;
    process.env.EDAMAM_RECIPE_APP_ID = originalAppId;
    process.env.EDAMAM_RECIPE_APP_KEY = originalAppKey;
  });
});

// ── POST /api/recipes/save ───────────────────────────────────────────────────

describe('POST /api/recipes/save', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/recipes/save')
      .send({ spoonacularId: 123, title: 'Test', calories: 100 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when spoonacularId is missing', async () => {
    const res = await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test' });
    expect(res.status).toBe(400);
  });

  it('saves a recipe and returns it', async () => {
    const recipe = {
      spoonacularId: 99999,
      title: 'Grilled Chicken Salad',
      image: 'https://example.com/chicken.jpg',
      sourceUrl: 'https://example.com/recipe/99',
      calories: 350,
      protein: 40,
      carbs: 15,
      fat: 12,
    };

    const res = await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send(recipe);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Grilled Chicken Salad');
    expect(res.body.recipeId).toBe(99999);
  });

  it('upserts (re-saves) the same recipe without duplicates', async () => {
    const recipe = { spoonacularId: 77777, title: 'Pasta', calories: 500 };

    await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send(recipe);

    const res = await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...recipe, title: 'Updated Pasta' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Updated Pasta');

    const count = await SavedRecipe.countDocuments({ recipeId: 77777 });
    expect(count).toBe(1);
  });
});

// ── GET /api/recipes/saved ───────────────────────────────────────────────────

describe('GET /api/recipes/saved', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/recipes/saved');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no recipes saved', async () => {
    const res = await request(app)
      .get('/api/recipes/saved')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('returns saved recipes sorted by createdAt descending', async () => {
    await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ spoonacularId: 1, title: 'First', calories: 100 });

    await new Promise(r => setTimeout(r, 10));

    await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ spoonacularId: 2, title: 'Second', calories: 200 });

    const res = await request(app)
      .get('/api/recipes/saved')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].title).toBe('Second'); // most recent first
    expect(res.body[1].title).toBe('First');
  });

  it('only returns recipes for the authenticated user', async () => {
    // Save a recipe for bob
    await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ spoonacularId: 555, title: 'Bobs Recipe', calories: 100 });

    // Register another user and save a different recipe
    await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'other@example.com' });

    const otherRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'password123' });

    await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${otherRes.body.token}`)
      .send({ spoonacularId: 666, title: 'Others Recipe', calories: 200 });

    // Bob should only see his recipe
    const res = await request(app)
      .get('/api/recipes/saved')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Bobs Recipe');
  });
});

// ── DELETE /api/recipes/saved/:id ────────────────────────────────────────────

describe('DELETE /api/recipes/saved/:id', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .delete('/api/recipes/saved/000000000000000000000000');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid MongoDB ObjectId', async () => {
    const res = await request(app)
      .delete('/api/recipes/saved/not-an-id')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 when recipe does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/recipes/saved/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it('deletes a saved recipe successfully', async () => {
    const saveRes = await request(app)
      .post('/api/recipes/save')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ spoonacularId: 12345, title: 'To Delete', calories: 300 });

    const recipeId = saveRes.body._id;

    const delRes = await request(app)
      .delete(`/api/recipes/saved/${recipeId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toBe('Recipe removed');

    const count = await SavedRecipe.countDocuments({ _id: recipeId });
    expect(count).toBe(0);
  });
});