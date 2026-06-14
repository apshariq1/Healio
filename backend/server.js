require('dotenv').config();
const path = require('path');  // ← moved to top

// ── Env Validation ─────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  console.error('FATAL: CLIENT_URL environment variable is not set');  // ← moved to top
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Database Connection ────────────────────────────────────────────────────
connectDB();

// ── Routes ─────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

const mealsRoutes = require('./routes/meals');
app.use('/api/meals', mealsRoutes);

const foodRoutes = require('./routes/food');
app.use('/api/food', foodRoutes);

const recipeRoutes = require('./routes/recipes');
app.use('/api/recipes', recipeRoutes);

const progressRoutes = require('./routes/progress');
app.use('/api/progress', progressRoutes);

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);  // ← must come BEFORE the catch-all

// ── Serve Frontend in Production ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Catch-all: send index.html for React Router (must be LAST)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// ── Start Server ───────────────────────────────────────────────────────────
if (require.main === module && process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

// require('dotenv').config();
// const path = require('path');

// if (!process.env.JWT_SECRET) {
//   console.error('FATAL: JWT_SECRET environment variable is not set');
//   process.exit(1);
// }

// const express = require('express');
// const cors = require('cors');
// const connectDB = require('./config/db');
// const { errorHandler } = require('./middleware/errorHandler');

// const app = express();

// // ── Middleware ──────────────────────────────────────────────────────────────
// app.use(express.json());
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'http://localhost:5173',
//   credentials: true,
// }));

// // ── Database Connection ────────────────────────────────────────────────────
// connectDB();

// // ── Routes ─────────────────────────────────────────────────────────────────
// // ── Auth Routes (Chunk 2) ───────────────────────────────────────────────────
// const authRoutes = require('./routes/auth');
// app.use('/api/auth', authRoutes);

// // ── User Routes (Chunk 3) ─────────────────────────────────────────────────────
// const userRoutes  = require('./routes/user');
// app.use('/api/user', userRoutes);

// // ── Meal Log Routes (Chunk 3) ───────────────────────────────────────────────
// const mealsRoutes = require('./routes/meals');
// app.use('/api/meals', mealsRoutes);

// // ── Food Search Route (Chunk 3) ─────────────────────────────────────────────
// const foodRoutes  = require('./routes/food');
// app.use('/api/food', foodRoutes);

// // ── Recipe Routes (Chunk 4) ───────────────────────────────────────────────
// const recipeRoutes  = require('./routes/recipes');
// app.use('/api/recipes', recipeRoutes);

// // ── Progress Routes (Chunk 4) ───────────────────────────────────────────────
// const progressRoutes = require('./routes/progress');
// app.use('/api/progress', progressRoutes);

// // ── Health Check ───────────────────────────────────────────────────────────
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok', timestamp: new Date().toISOString() });
// });


// // Serve frontend in production
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../frontend/dist')));

//   // Catch-all: send index.html for any non-API route (for React Router)
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
//   });
// }
// // ── Global Error Handler ───────────────────────────────────────────────────
// app.use(errorHandler);

// if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
//   console.error('FATAL: CLIENT_URL environment variable is not set');
//   process.exit(1);
// }
// // ── Start Server ───────────────────────────────────────────────────────────
// if (require.main === module && process.env.NODE_ENV !== 'test') {
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }

// module.exports = app;