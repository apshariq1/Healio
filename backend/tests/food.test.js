// Mock connectDB before requiring anything else.
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

jest.setTimeout(60000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');

let mongoServer;
let authToken;

const VALID_USER = {
  name: 'Eve',
  email: 'eve@example.com',
  password: 'password123',
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
  const res = await request(app)
    .post('/api/auth/register')
    .send(VALID_USER);
  authToken = res.body.token;
});

// Helper to mock global.fetch for this test file
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('GET /api/food/search', () => {
  describe('validation', () => {
    it('returns 400 when query parameter is missing', async () => {
      const res = await request(app)
      .get('/api/food/search')
      .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.path === 'query')).toBe(true);
    });

    it('returns 400 when query parameter is empty', async () => {
       const res = await request(app)
     .get('/api/food/search?query=')
     .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.errors.some(e => e.path === 'query')).toBe(true);
    });

    it('returns 400 when query parameter is whitespace only', async () => {
      const res = await request(app)
     .get('/api/food/search?query=   ')
     .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('with mocked Open Food Facts', () => {
    it('returns formatted food items from OFF', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            {
              code: 'food_banana',
              product_name: 'Banana',
              nutriments: {
                'energy-kcal_100g': 89,
                'proteins_100g': 1.1,
                'carbohydrates_100g': 22.8,
                'fat_100g': 0.3,
                'fiber_100g': 2.6,
              },
            },
          ],
        }),
      });

      const res = await request(app)
     .get('/api/food/search?query=banana')
     .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0]).toMatchObject({
        foodId: 'food_banana',
        label: 'Banana',
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3,
        fibre: 2.6,
      });
    });

    it('falls back to demo foods when OFF returns non-2xx', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      });

      const res = await request(app)
     .get('/api/food/search?query=banana')
     .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.source).toBe('demo');
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.message).toContain('502');
    });

    it('falls back to demo foods when fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const res = await request(app)
     .get('/api/food/search?query=banana')
     .set('Authorization', `Bearer ${authToken}`);
     
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('demo');
      expect(res.body.results.length).toBeGreaterThan(0);
    });
  });
});
