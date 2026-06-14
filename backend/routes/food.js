const express = require('express');
const { query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Demo food database (fallback when Open Food Facts is unavailable) ─────────
const MOCK_FOODS = [
  { foodId: 'demo_1',  label: 'Banana',               calories: 89,  protein: 1.1,  carbs: 22.8, fat: 0.3,  fibre: 2.6 },
  { foodId: 'demo_2',  label: 'Chicken Breast (raw)', calories: 165, protein: 31,   carbs: 0,    fat: 3.6,  fibre: 0 },
  { foodId: 'demo_3',  label: 'White Rice (cooked)',  calories: 130, protein: 2.7,  carbs: 28,   fat: 0.3,  fibre: 0.4 },
  { foodId: 'demo_4',  label: 'Egg (large)',          calories: 72,  protein: 6.3,  carbs: 0.4,  fat: 4.8,  fibre: 0 },
  { foodId: 'demo_5',  label: 'Apple',                calories: 52,  protein: 0.3,  carbs: 14,   fat: 0.2,  fibre: 2.4 },
  { foodId: 'demo_6',  label: 'Milk (whole)',         calories: 61,  protein: 3.2,  carbs: 4.8,  fat: 3.3,  fibre: 0 },
  { foodId: 'demo_7',  label: 'Oats (rolled)',        calories: 389, protein: 16.9, carbs: 66,   fat: 6.9,  fibre: 10.6 },
  { foodId: 'demo_8',  label: 'Broccoli',             calories: 34,  protein: 2.8,  carbs: 7,    fat: 0.4,  fibre: 2.6 },
  { foodId: 'demo_9',  label: 'Salmon (raw)',         calories: 208, protein: 20,   carbs: 0,    fat: 13,   fibre: 0 },
  { foodId: 'demo_10', label: 'Greek Yogurt',         calories: 59,  protein: 10,   carbs: 3.6,  fat: 0.4,  fibre: 0 },
  { foodId: 'demo_11', label: 'Avocado',              calories: 160, protein: 2,    carbs: 9,    fat: 15,   fibre: 7 },
  { foodId: 'demo_12', label: 'Almonds',              calories: 579, protein: 21,   carbs: 22,   fat: 50,   fibre: 12.5 },
  { foodId: 'demo_13', label: 'Sweet Potato',         calories: 86,  protein: 1.6,  carbs: 20,   fat: 0.1,  fibre: 3 },
  { foodId: 'demo_14', label: 'Spinach',              calories: 23,  protein: 2.9,  carbs: 3.6,  fat: 0.4,  fibre: 2.2 },
  { foodId: 'demo_15', label: 'Brown Bread (slice)',  calories: 75,  protein: 3.1,  carbs: 13,   fat: 1,    fibre: 1.5 },
  { foodId: 'demo_16', label: 'Peanut Butter',        calories: 588, protein: 25,   carbs: 20,   fat: 50,   fibre: 6 },
  { foodId: 'demo_17', label: 'Cheddar Cheese',       calories: 402, protein: 25,   carbs: 1.3,  fat: 33,   fibre: 0 },
  { foodId: 'demo_18', label: 'Pasta (cooked)',       calories: 131, protein: 5,    carbs: 25,   fat: 1.1,  fibre: 1.8 },
  { foodId: 'demo_19', label: 'Carrot',               calories: 41,  protein: 0.9,  carbs: 10,   fat: 0.2,  fibre: 2.8 },
  { foodId: 'demo_20', label: 'Tofu (firm)',          calories: 144, protein: 17,   carbs: 3,    fat: 9,    fibre: 2.3 },
  { foodId: 'demo_21', label: 'Ground Beef (lean)',   calories: 250, protein: 26,   carbs: 0,    fat: 15,   fibre: 0 },
  { foodId: 'demo_22', label: 'Orange',               calories: 47,  protein: 0.9,  carbs: 12,   fat: 0.1,  fibre: 2.4 },
  { foodId: 'demo_23', label: 'Olive Oil (1 tbsp)',   calories: 119, protein: 0,    carbs: 0,    fat: 13.5, fibre: 0 },
  { foodId: 'demo_24', label: 'Quinoa (cooked)',      calories: 120, protein: 4.4,  carbs: 21,   fat: 1.9,  fibre: 2.8 },
  { foodId: 'demo_25', label: 'Tuna (canned)',        calories: 132, protein: 28,   carbs: 0,    fat: 1,    fibre: 0 },
];

function searchMockFoods(q) {
  const term = q.toLowerCase().trim();
  if (!term) return MOCK_FOODS;
  return MOCK_FOODS.filter(f =>
    f.label.toLowerCase().includes(term) ||
    term.split(/[ ,]+/).some(word => f.label.toLowerCase().includes(word))
  );
}

// ── Open Food Facts ──────────────────────────────────────────────────────────

const OFF_BASE = 'https://world.openfoodfacts.org/cgi/search.pl';

function offUrl(searchQuery) {
  const params = new URLSearchParams({
    search_terms: searchQuery,
    json: 'true',
    page_size: '12',
  });
  return `${OFF_BASE}?${params.toString()}`;
}

function formatFoodItem(product) {
  if (!product) return null;

  const code = product.code || product._id || '';
  const label = product.product_name || product.product_name_en || '';
  if (!label) return null;

  const n = product.nutriments || {};

  return {
    foodId:   String(code),
    label:    label,
    calories: n['energy-kcal_100g'] || n['energy-kcal'] || n['energy_100g'] || 0,
    protein:  n['proteins_100g']    || n['proteins']    || 0,
    carbs:    n['carbohydrates_100g'] || n['carbohydrates'] || 0,
    fat:      n['fat_100g']         || n['fat']         || 0,
    fibre:    n['fiber_100g']       || n['fiber']       || n['fibre_100g'] || n['fibre'] || 0,
  };
}

// ── GET /api/food/search ─────────────────────────────────────────────────────

router.get(
  '/search',
  auth,
  [
    query('query')
      .trim()
      .notEmpty().withMessage('query parameter is required')
      .isLength({ min: 1 }).withMessage('query cannot be empty'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const searchQuery = req.query.query;
      const url = offUrl(searchQuery);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.warn(`Open Food Facts API error ${response.status}: falling back to demo foods.`);
        return res.json({
          results: searchMockFoods(searchQuery),
          query: searchQuery,
          source: 'demo',
          message: `Open Food Facts returned ${response.status}. Showing demo foods.`,
        });
      }

      const data = await response.json();

      const hits = (data.products || [])
        .map(p => formatFoodItem(p))
        .filter(Boolean)
        .slice(0, 12);

      res.json({ results: hits, query: searchQuery });
    } catch (err) {
      console.warn('Open Food Facts fetch failed:', err.message);
      res.json({
        results: searchMockFoods(req.query.query || ''),
        query: req.query.query || '',
        source: 'demo',
        message: 'Open Food Facts unavailable. Showing demo foods.',
      });
    }
  }
);

module.exports = router;
