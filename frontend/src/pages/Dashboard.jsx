import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Utensils, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { CalorieRing } from '../components/CalorieRing';
import { MacroBars } from '../components/MacroBars';
import { WaterTracker } from '../components/WaterTracker';
import client from '../api/client';

function getTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SkeletonBlock({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [mealLog, setMealLog] = useState(null);
  const [streak, setStreak] = useState(0);
  const today = getTodayDate();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mealRes, userRes, streakRes] = await Promise.all([
        client.get(`/meals/${today}`).catch(() => ({ data: null })),
        client.get('/auth/me').catch(() => ({ data: null })),
        client.get('/progress/streak').catch(() => ({ data: { streak: 0 } })),
      ]);
      setMealLog(mealRes.data || null);
      setUser(userRes.data?.user || userRes.data || null);
      setStreak(streakRes.data?.streak ?? 0);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handleFocus = () => fetchAll();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAll]);

  // Compute totals from meal log
  const totalConsumed = mealLog?.totalCalories || 0;
  const totalProtein = mealLog?.totalProtein || 0;
  const totalCarbs = mealLog?.totalCarbs || 0;
  const totalFat = mealLog?.totalFat || 0;
  const totalFibre = mealLog?.totalFibre || 0;

  const calorieTarget = user?.dailyCalorieTarget || 0;
  const remaining = Math.max(0, calorieTarget - totalConsumed);

  const macroTarget = {
    protein: user?.dailyProtein || 0,
    carbs: user?.dailyCarbs || 0,
    fat: user?.dailyFat || 0,
    fibre: user?.dailyFibre || 0,
  };

  const macroCurrent = {
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    fibre: totalFibre,
  };

  // Count meals logged today
  const mealsLogged = mealLog
    ? ['breakfast', 'lunch', 'dinner', 'snacks'].filter(
        (m) => Array.isArray(mealLog.meals?.[m]) && mealLog.meals?.[m].length > 0
      ).length
    : 0;

  const mealGroups = [
    { key: 'breakfast', label: 'Breakfast', items: mealLog?.meals?.breakfast || [] },
    { key: 'lunch', label: 'Lunch', items: mealLog?.meals?.lunch || [] },
    { key: 'dinner', label: 'Dinner', items: mealLog?.meals?.dinner || [] },
    { key: 'snacks', label: 'Snacks', items: mealLog?.meals?.snacks || [] },
  ];

  const hasAnyItems = mealGroups.some((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Two-column layout: single col on mobile, two on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">
          {/* Calorie Ring Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
              Calories
            </h2>
            {loading ? (
              <div className="flex justify-center">
                <SkeletonBlock className="w-48 h-48 rounded-full" />
              </div>
            ) : (
              <CalorieRing consumed={totalConsumed} target={calorieTarget} />
            )}
          </div>

          {/* Stats Row */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{remaining}</p>
                <p className="text-xs text-gray-500 mt-1">Remaining</p>
              </div>
              <div className="text-center border-l border-gray-100">
                <p className="text-2xl font-bold text-blue-600">{mealsLogged}</p>
                <p className="text-xs text-gray-500 mt-1">Meals Today</p>
              </div>
              <div className="text-center border-l border-gray-100">
                <p className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5" />
                  {streak}
                </p>
                <p className="text-xs text-gray-500 mt-1">Day Streak</p>
              </div>
            </div>
          </div>

          {/* Water Tracker Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <WaterTracker />
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">
          {/* Macro Bars Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Macros
            </h2>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <SkeletonBlock className="h-3 w-full mb-1" />
                    <SkeletonBlock className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <MacroBars current={macroCurrent} target={macroTarget} />
            )}
          </div>

          {/* Daily Meal Breakdown Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Today's Meals
              </h2>
              <Utensils className="w-4 h-4 text-gray-400" />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBlock className="h-4 w-4 rounded" />
                    <SkeletonBlock className="h-4 flex-1" />
                    <SkeletonBlock className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : hasAnyItems ? (
              <div className="space-y-4">
                {mealGroups.map(({ key, label, items }) => {
                  if (!items || items.length === 0) return null;
                  const groupCal = items.reduce(
                    (sum, item) => sum + (item.calories || 0),
                    0
                  );
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {label}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {Math.round(groupCal)} kcal
                        </span>
                      </div>
                      <ul className="ml-2 space-y-1">
                        {items.map((item) => (
                          <li
                            key={item.foodId || item._id}
                            className="flex justify-between items-center text-sm text-gray-600"
                          >
                            <span className="truncate flex-1 mr-2">
                              {item.label}
                              {item.quantity && (
                                <span className="text-gray-400 text-xs ml-1">
                                  {' '}
                                  ({item.quantity}
                                  {item.unit || 'g'})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {Math.round(item.calories || 0)} kcal
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Utensils className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No meals logged yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start tracking your nutrition today!
                </p>
              </div>
            )}

            {/* Log Meal CTA */}
            <Link
              to="/log"
              className="mt-5 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Meal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}