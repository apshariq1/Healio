/**
 * Calculate BMR using the Mifflin-St Jeor Equation.
 *
 * For males:   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
 * For females: BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
 *
 * TDEE is calculated as BMR × 1.55 (moderate activity multiplier).
 *
 * Goal adjustments:
 *   - Weight Loss:   TDEE − 500 kcal, clamped to a minimum of 1200 kcal
 *   - Muscle Gain:   TDEE + 300 kcal
 *   - Maintenance:   TDEE
 *   - Clean Eating:  TDEE
 *
 * Macro split ratios (% of total calories):
 *   Weight Loss  → P40 / C35 / F25
 *   Muscle Gain  → P35 / C45 / F20
 *   Maintenance  → P30 / C45 / F25
 *   Clean Eating → P30 / C40 / F30
 *
 * Protein & Carbs: 4 kcal/g  |  Fat: 9 kcal/g  |  Fibre: 30 g flat target
 *
 * @param {Object} params
 * @param {number}  params.weight    - weight in kg
 * @param {number}  params.height    - height in cm
 * @param {number}  params.age       - age in years
 * @param {string}  params.gender    - 'Male' or 'Female'
 * @param {string}  params.goal      - 'Weight Loss', 'Muscle Gain', 'Maintenance', or 'Clean Eating'
 * @returns {Object} { dailyCalorieTarget, dailyProtein, dailyCarbs, dailyFat, dailyFibre }
 */
function macroCalc({ weight, height, age, gender, goal }) {
  if (!weight || !height || !age || !gender || !goal) {
    throw new Error('All parameters (weight, height, age, gender, goal) are required');
  }

  if (weight < 20 || weight > 500) {
    throw new Error('Weight must be between 20 and 500 kg');
  }
  if (height < 50 || height > 300) {
    throw new Error('Height must be between 50 and 300 cm');
  }
  if (age < 10 || age > 120) {
    throw new Error('Age must be between 10 and 120');
  }
  if (!['Male', 'Female'].includes(gender)) {
    throw new Error('Gender must be "Male" or "Female"');
  }
  if (!['Weight Loss', 'Muscle Gain', 'Maintenance', 'Clean Eating'].includes(goal)) {
    throw new Error(
      'Goal must be "Weight Loss", "Muscle Gain", "Maintenance", or "Clean Eating"'
    );
  }

  // Mifflin-St Jeor BMR
  const bmr = gender === 'Male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  // TDEE at activity level 1.55 (moderate activity / office work)
  const tdee = bmr * 1.55;

  // Goal-adjusted calorie target
  let dailyCalorieTarget;
  switch (goal) {
    case 'Weight Loss':
      dailyCalorieTarget = tdee - 500;
      break;
    case 'Muscle Gain':
      dailyCalorieTarget = tdee + 300;
      break;
    case 'Maintenance':
    case 'Clean Eating':
    default:
      dailyCalorieTarget = tdee;
      break;
  }

  // Clamp Weight Loss minimum to 1200 kcal
  if (goal === 'Weight Loss' && dailyCalorieTarget < 1200) {
    dailyCalorieTarget = 1200;
  }

  // Macro split ratios
  let proteinRatio, carbsRatio, fatRatio;
  switch (goal) {
    case 'Weight Loss':
      proteinRatio = 0.40;
      carbsRatio   = 0.35;
      fatRatio     = 0.25;
      break;
    case 'Muscle Gain':
      proteinRatio = 0.35;
      carbsRatio   = 0.45;
      fatRatio     = 0.20;
      break;
    case 'Maintenance':
      proteinRatio = 0.30;
      carbsRatio   = 0.45;
      fatRatio     = 0.25;
      break;
    case 'Clean Eating':
      proteinRatio = 0.30;
      carbsRatio   = 0.40;
      fatRatio     = 0.30;
      break;
    default:
      proteinRatio = 0.30;
      carbsRatio   = 0.45;
      fatRatio     = 0.25;
  }

  const proteinCalories = dailyCalorieTarget * proteinRatio;
  const carbsCalories   = dailyCalorieTarget * carbsRatio;
  const fatCalories     = dailyCalorieTarget * fatRatio;

  // Convert calories to grams
  const dailyProtein = Math.round(proteinCalories / 4);
  const dailyCarbs   = Math.round(carbsCalories / 4);
  const dailyFat     = Math.round(fatCalories / 9);
  const dailyFibre   = 30; // flat 30 g target regardless of goal

  return {
    dailyCalorieTarget: Math.round(dailyCalorieTarget),
    dailyProtein,
    dailyCarbs,
    dailyFat,
    dailyFibre,
  };
}

module.exports = macroCalc;