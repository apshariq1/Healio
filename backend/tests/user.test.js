// Mock connectDB before requiring anything else that might call it.
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

jest.setTimeout(60000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');

let mongoServer;
let authToken;
let userId;

const VALID_USER = {
  name: 'Charlie',
  email: 'charlie@example.com',
  password: 'password123',
  gender: 'Male',
  height: 180,
  age: 30,
  weight: 75,
  healthGoal: 'Maintenance',
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
  // Register a user and capture token for authenticated tests
  const res = await request(app)
    .post('/api/auth/register')
    .send(VALID_USER);
  authToken = res.body.token;
  userId = res.body.user._id;
});

describe('PUT /api/user/profile', () => {
  it('updates name and returns updated user without password', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Charles' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Charles');
    expect(res.body).not.toHaveProperty('password');
  });

  it('updates weight, height, age, gender and recalculates macro targets', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 80, height: 185, age: 31, gender: 'Male' });

    expect(res.status).toBe(200);
    expect(res.body.weight).toBe(80);
    expect(res.body.height).toBe(185);
    expect(res.body.dailyCalorieTarget).toBeGreaterThan(0);
    expect(res.body.dailyProtein).toBeGreaterThan(0);
  });

  it('returns 400 for invalid gender', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ gender: 'Other' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'gender')).toBe(true);
  });

  it('returns 400 for weight out of range', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weight: 600 });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'weight')).toBe(true);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .send({ name: 'NoAuth' });

    expect(res.status).toBe(401);
  });

  it('returns 404 when user is deleted from DB but token is valid', async () => {
    await User.findByIdAndDelete(userId);
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Gone' });

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/user/goal', () => {
  it('updates healthGoal and recalculates macro targets', async () => {
    const res = await request(app)
      .put('/api/user/goal')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ healthGoal: 'Muscle Gain' });

    expect(res.status).toBe(200);
    expect(res.body.healthGoal).toBe('Muscle Gain');
    expect(res.body.dailyCalorieTarget).toBeGreaterThan(0);
  });

  it('returns 400 for invalid healthGoal', async () => {
    const res = await request(app)
      .put('/api/user/goal')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ healthGoal: 'Super Mode' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'healthGoal')).toBe(true);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .put('/api/user/goal')
      .send({ healthGoal: 'Weight Loss' });

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/user/allergies', () => {
  it('replaces allergies array', async () => {
    const res = await request(app)
      .put('/api/user/allergies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ allergies: ['Peanuts', 'Shellfish'] });

    expect(res.status).toBe(200);
    expect(res.body.allergies).toEqual(['Peanuts', 'Shellfish']);
  });

  it('clears allergies when empty array is sent', async () => {
    await request(app)
      .put('/api/user/allergies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ allergies: ['Gluten'] });

    const res = await request(app)
      .put('/api/user/allergies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ allergies: [] });

    expect(res.status).toBe(200);
    expect(res.body.allergies).toEqual([]);
  });

  it('returns 400 when allergies is not an array', async () => {
    const res = await request(app)
      .put('/api/user/allergies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ allergies: 'Peanuts' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'allergies')).toBe(true);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .put('/api/user/allergies')
      .send({ allergies: ['Dairy'] });

    expect(res.status).toBe(401);
  });
});