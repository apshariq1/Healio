// Mock connectDB BEFORE requiring server.js (which calls it on import and exits on failure).
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

// Increase Jest hook timeout — MongoMemoryServer binary download can take >5s
jest.setTimeout(60000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');

let mongoServer;

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
});

const VALID_USER = {
  name: 'Alice Smith',
  email: 'alice@example.com',
  password: 'password123',
  gender: 'Female',
  height: 165,
  age: 28,
  weight: 60,
  healthGoal: 'Maintenance',
};

describe('POST /api/auth/register', () => {
  it('registers a new user and returns token + user without password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.name).toBe('Alice Smith');
  });

  it('calculates macro targets when all body fields are provided', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(VALID_USER);

    expect(res.body.user.dailyCalorieTarget).toBeGreaterThan(0);
    expect(res.body.user.dailyProtein).toBeGreaterThan(0);
    expect(res.body.user.dailyCarbs).toBeGreaterThan(0);
    expect(res.body.user.dailyFat).toBeGreaterThan(0);
    expect(res.body.user.dailyFibre).toBe(30);
  });

  it('creates user with zero targets when onboarding fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.dailyCalorieTarget).toBe(0);
    expect(res.body.user.dailyProtein).toBe(0);
  });

  it('returns 400 if email already exists', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email already registered');
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'name')).toBe(true);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'email')).toBe(true);
  });

  it('returns 400 for password shorter than 6 chars', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.path === 'password')).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
  });

  it('returns token + user for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(VALID_USER);
    token = res.body.token;
  });

  it('returns user profile for a valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body).not.toHaveProperty('password');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('returns 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired token');
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', token);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });
});