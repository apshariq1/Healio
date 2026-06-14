const macroCalc = require('../utils/macroCalc');

// Test constants
const BASE_PARAMS = { weight: 75, height: 175, age: 30 };

describe('macroCalc', () => {
  // ── Goal: Weight Loss ───────────────────────────────────────────────────
  describe('Weight Loss', () => {
    it('male: calculates correct BMR and TDEE', () => {
      // BMR = 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
      // TDEE = 1698.75 * 1.55 = 2633.06
      // Target = 2633.06 - 500 = 2133.06 → rounded 2133
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Weight Loss' });
      expect(result.dailyCalorieTarget).toBe(2133);
    });

    it('female: calculates correct BMR and TDEE', () => {
      // BMR = 10*75 + 6.25*175 - 5*30 - 161 = 750 + 1093.75 - 150 - 161 = 1532.75
      // TDEE = 1532.75 * 1.55 = 2375.76
      // Target = 2375.76 - 500 = 1875.76 → rounded 1876
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Female', goal: 'Weight Loss' });
      expect(result.dailyCalorieTarget).toBe(1876);
    });

    it('male: macros use P40/C35/F25 split', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Weight Loss' });
      // 2133 * 0.40 / 4 = 213.3 → 213 g protein
      expect(result.dailyProtein).toBe(213);
      // 2133 * 0.35 / 4 = 186.6375 → 187 g carbs
      expect(result.dailyCarbs).toBe(187);
      // 2133 * 0.25 / 9 = 59.25 → 59 g fat
      expect(result.dailyFat).toBe(59);
    });

    it('female: macros use P40/C35/F25 split', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Female', goal: 'Weight Loss' });
      // 1876 * 0.40 / 4 = 187.6 → 188 g protein
      expect(result.dailyProtein).toBe(188);
      // 1876 * 0.35 / 4 = 164.15 → 164 g carbs
      expect(result.dailyCarbs).toBe(164);
      // 1876 * 0.25 / 9 = 52.11 → 52 g fat
      expect(result.dailyFat).toBe(52);
    });

    it('clamp: Weight Loss target below 1200 kcal is clamped to 1200', () => {
      // A very small / low-BMR person should not go below 1200
      const result = macroCalc({
        weight: 45,
        height: 150,
        age: 60,
        gender: 'Female',
        goal: 'Weight Loss',
      });
      // BMR = 10*45 + 6.25*150 - 5*60 - 161 = 450 + 937.5 - 300 - 161 = 926.5
      // TDEE = 926.5 * 1.55 = 1436.075
      // Target = 1436.075 - 500 = 936.075 → clamped to 1200
      expect(result.dailyCalorieTarget).toBe(1200);
    });

    it('fibre is always 30g flat for Weight Loss', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Weight Loss' });
      expect(result.dailyFibre).toBe(30);
    });
  });

  // ── Goal: Muscle Gain ───────────────────────────────────────────────────
  describe('Muscle Gain', () => {
    it('male: target = TDEE + 300', () => {
      // TDEE = 2633.06, +300 = 2933.06 → rounded 2933
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Muscle Gain' });
      expect(result.dailyCalorieTarget).toBe(2933);
    });

    it('female: target = TDEE + 300', () => {
      // TDEE = 2375.76, +300 = 2675.76 → rounded 2676
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Female', goal: 'Muscle Gain' });
      expect(result.dailyCalorieTarget).toBe(2676);
    });

    it('male: macros use P35/C45/F20 split', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Muscle Gain' });
      // 2933 * 0.35 / 4 = 256.6375 → 257 g protein
      expect(result.dailyProtein).toBe(257);
      // 2933 * 0.45 / 4 = 329.9625 → 330 g carbs
      expect(result.dailyCarbs).toBe(330);
      // 2933 * 0.20 / 9 = 65.1777… → 65 g fat
      expect(result.dailyFat).toBe(65);
    });

    it('fibre is always 30g flat for Muscle Gain', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Female', goal: 'Muscle Gain' });
      expect(result.dailyFibre).toBe(30);
    });
  });

  // ── Goal: Maintenance ───────────────────────────────────────────────────
  describe('Maintenance', () => {
    it('male: target = TDEE (no adjustment)', () => {
      // TDEE = 2633.06 → rounded 2633
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Maintenance' });
      expect(result.dailyCalorieTarget).toBe(2633);
    });

    it('female: target = TDEE (no adjustment)', () => {
      // TDEE = 2375.76 → rounded 2376
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Female', goal: 'Maintenance' });
      expect(result.dailyCalorieTarget).toBe(2376);
    });

    it('male: macros use P30/C45/F25 split', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Maintenance' });
      // 2633 * 0.30 / 4 = 197.475 → 197 g protein
      expect(result.dailyProtein).toBe(197);
      // 2633 * 0.45 / 4 = 296.2125 → 296 g carbs
      expect(result.dailyCarbs).toBe(296);
      // 2633 * 0.25 / 9 = 73.1388… → 73 g fat
      expect(result.dailyFat).toBe(73);
    });

    it('fibre is always 30g flat for Maintenance', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Maintenance' });
      expect(result.dailyFibre).toBe(30);
    });
  });

  // ── Goal: Clean Eating ──────────────────────────────────────────────────
  describe('Clean Eating', () => {
    it('male: target = TDEE (no adjustment)', () => {
      // TDEE = 2633.06 → rounded 2633
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Clean Eating' });
      expect(result.dailyCalorieTarget).toBe(2633);
    });

    it('female: target = TDEE (no adjustment)', () => {
      // TDEE = 2375.76 → rounded 2376
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Female', goal: 'Clean Eating' });
      expect(result.dailyCalorieTarget).toBe(2376);
    });

    it('male: macros use P30/C40/F30 split', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Clean Eating' });
      // 2633 * 0.30 / 4 = 197.475 → 197 g protein
      expect(result.dailyProtein).toBe(197);
      // 2633 * 0.40 / 4 = 263.3 → 263 g carbs
      expect(result.dailyCarbs).toBe(263);
      // 2633 * 0.30 / 9 = 87.7666… → 88 g fat
      expect(result.dailyFat).toBe(88);
    });

    it('fibre is always 30g flat for Clean Eating', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Female', goal: 'Clean Eating' });
      expect(result.dailyFibre).toBe(30);
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('weight at lower bound (20 kg) calculates without error', () => {
      const result = macroCalc({
        weight: 20,
        height: 100,
        age: 10,
        gender: 'Male',
        goal: 'Maintenance',
      });
      expect(result.dailyCalorieTarget).toBeGreaterThan(0);
      expect(typeof result.dailyProtein).toBe('number');
    });

    it('weight at upper bound (500 kg) calculates without error', () => {
      const result = macroCalc({
        weight: 500,
        height: 250,
        age: 50,
        gender: 'Male',
        goal: 'Weight Loss',
      });
      expect(result.dailyCalorieTarget).toBeGreaterThan(0);
    });

    it('age at lower bound (10) calculates without error', () => {
      const result = macroCalc({
        weight: 40,
        height: 140,
        age: 10,
        gender: 'Female',
        goal: 'Maintenance',
      });
      expect(result.dailyCalorieTarget).toBeGreaterThan(0);
    });

    it('age at upper bound (120) calculates without error', () => {
      const result = macroCalc({
        weight: 80,
        height: 170,
        age: 120,
        gender: 'Male',
        goal: 'Maintenance',
      });
      expect(result.dailyCalorieTarget).toBeGreaterThan(0);
    });

    it('very tall person (300 cm) calculates without error', () => {
      const result = macroCalc({
        weight: 100,
        height: 300,
        age: 30,
        gender: 'Male',
        goal: 'Muscle Gain',
      });
      expect(result.dailyCalorieTarget).toBeGreaterThan(0);
    });

    it('very short person (50 cm) calculates without error', () => {
      const result = macroCalc({
        weight: 30,
        height: 50,
        age: 15,
        gender: 'Female',
        goal: 'Weight Loss',
      });
      expect(result.dailyCalorieTarget).toBeGreaterThan(0);
    });

    it('Muscle Gain never goes below 1200 — no clamp applied (TDEE+300 always > TDEE)', () => {
      // Even the lowest BMR case should have TDEE+300 well above 1200
      const result = macroCalc({
        weight: 45,
        height: 150,
        age: 60,
        gender: 'Female',
        goal: 'Muscle Gain',
      });
      expect(result.dailyCalorieTarget).toBeGreaterThan(1200);
    });

    it('returns all five required fields', () => {
      const result = macroCalc({ ...BASE_PARAMS, gender: 'Male', goal: 'Maintenance' });
      expect(result).toHaveProperty('dailyCalorieTarget');
      expect(result).toHaveProperty('dailyProtein');
      expect(result).toHaveProperty('dailyCarbs');
      expect(result).toHaveProperty('dailyFat');
      expect(result).toHaveProperty('dailyFibre');
    });

    it('throws for missing weight', () => {
      expect(() =>
        macroCalc({ height: 175, age: 30, gender: 'Male', goal: 'Maintenance' })
      ).toThrow('All parameters');
    });

    it('throws for missing gender', () => {
      expect(() =>
        macroCalc({ weight: 75, height: 175, age: 30, goal: 'Maintenance' })
      ).toThrow('All parameters');
    });

    it('throws for missing goal', () => {
      expect(() =>
        macroCalc({ weight: 75, height: 175, age: 30, gender: 'Male' })
      ).toThrow('All parameters');
    });

    it('throws for invalid gender string', () => {
      expect(() =>
        macroCalc({ weight: 75, height: 175, age: 30, gender: 'Other', goal: 'Maintenance' })
      ).toThrow('Gender must be');
    });

    it('throws for invalid goal string', () => {
      expect(() =>
        macroCalc({ weight: 75, height: 175, age: 30, gender: 'Male', goal: 'Bulk' })
      ).toThrow('Goal must be');
    });

    it('throws for weight below 20', () => {
      expect(() =>
        macroCalc({ weight: 19, height: 175, age: 30, gender: 'Male', goal: 'Maintenance' })
      ).toThrow('Weight must be between');
    });

    it('throws for height above 300', () => {
      expect(() =>
        macroCalc({ weight: 75, height: 301, age: 30, gender: 'Male', goal: 'Maintenance' })
      ).toThrow('Height must be between');
    });

    it('throws for age below 10', () => {
      expect(() =>
        macroCalc({ weight: 75, height: 175, age: 9, gender: 'Male', goal: 'Maintenance' })
      ).toThrow('Age must be between');
    });

    it('throws for age above 120', () => {
      expect(() =>
        macroCalc({ weight: 75, height: 175, age: 121, gender: 'Male', goal: 'Maintenance' })
      ).toThrow('Age must be between');
    });
  });
});