import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { MealSection } from '../components/MealSection';
import { FoodSearchModal } from '../components/FoodSearchModal';

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

function formatDate(dateStr) {
  return dateStr; // YYYY-MM-DD
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function LogMeal() {
  const { date } = useParams();
  const navigate = useNavigate();
  const currentDate = date || getToday();

  const [mealLog, setMealLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const fetchMealLog = useCallback(async (dateToFetch) => {
    setLoading(true);
    try {
      const res = await api.get(`/meals/${dateToFetch}`);
      setMealLog(res.data);
    } catch (err) {
      toast.error('Failed to load meal log');
      setMealLog({
        date: dateToFetch,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFibre: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMealLog(currentDate);
  }, [currentDate, fetchMealLog]);

  const handlePrevDay = () => {
    navigate(`/log/${addDays(currentDate, -1)}`);
  };

  const handleNextDay = () => {
    navigate(`/log/${addDays(currentDate, 1)}`);
  };

  const handleToday = () => {
    navigate('/log');
  };

  const handleOpenModal = (category) => {
    setActiveCategory(category);
    setModalOpen(true);
  };

  const handleAddFood = async (scaledItem) => {
    try {
      await api.post(`/meals/${currentDate}/add`, {
        mealCategory: activeCategory.toLowerCase(),
        foodItem: {
          label: scaledItem.label,
          calories: scaledItem.calories,
          protein: scaledItem.protein,
          carbs: scaledItem.carbs,
          fat: scaledItem.fat,
          fibre: scaledItem.fibre,
          quantity: scaledItem.quantity,
          unit: scaledItem.unit,
        },
      });
      toast.success(`${scaledItem.label} added to ${activeCategory}`);
      setModalOpen(false);
      fetchMealLog(currentDate);
    } catch (err) {
      toast.error('Failed to add food');
    }
  };

  const handleEditItem = async (item, updates, category) => {
    setSavingId(item._id || item.foodId);
    try {
      const multiplier = updates.unit === 'g' ? updates.quantity / 100 : updates.quantity;
      const basePer100 = {
        calories: item.calories / (item.unit === 'g' ? item.quantity / 100 : item.quantity || 1),
        protein: item.protein / (item.unit === 'g' ? item.quantity / 100 : item.quantity || 1),
        carbs: item.carbs / (item.unit === 'g' ? item.quantity / 100 : item.quantity || 1),
        fat: item.fat / (item.unit === 'g' ? item.quantity / 100 : item.quantity || 1),
        fibre: item.fibre / (item.unit === 'g' ? item.quantity / 100 : item.quantity || 1),
      };
      const scaled = {
        foodId: item.foodId || item._id,
        label: item.label,
        quantity: updates.quantity,
        unit: updates.unit,
        calories: Math.round(basePer100.calories * multiplier),
        protein: Math.round(basePer100.protein * multiplier * 10) / 10,
        carbs: Math.round(basePer100.carbs * multiplier * 10) / 10,
        fat: Math.round(basePer100.fat * multiplier * 10) / 10,
        fibre: Math.round(basePer100.fibre * multiplier * 10) / 10,
      };
      await api.put(`/meals/${currentDate}/edit/${item.foodId || item._id}`, {
        mealCategory: category,
        foodItem: scaled,
      });
      toast.success('Food updated');
      fetchMealLog(currentDate);
    } catch (err) {
      toast.error('Failed to update food');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteItem = async (item, category) => {
    try {
      await api.delete(`/meals/${currentDate}/remove/${item.foodId || item._id}`, {
        data: { mealCategory: category },
      });
      toast.success(`${item.label} removed`);
      fetchMealLog(currentDate);
    } catch (err) {
      toast.error('Failed to delete food');
    }
  };

  const getCategoryItems = (category) => {
    if (!mealLog) return [];
    const key = category.toLowerCase();
    return mealLog.meals?.[key] || [];
  };

  const getCategorySubtotal = (category) => {
    const items = getCategoryItems(category);
    return items.reduce((sum, item) => sum + (item.calories || 0), 0);
  };

  const dayTotals = mealLog
    ? {
        totalCalories: mealLog.totalCalories || 0,
        totalProtein: mealLog.totalProtein || 0,
        totalCarbs: mealLog.totalCarbs || 0,
        totalFat: mealLog.totalFat || 0,
        totalFibre: mealLog.totalFibre || 0,
      }
    : { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFibre: 0 };

  const isToday = currentDate === getToday();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Meal Log</h1>
        <p className="text-sm text-gray-500">Track what you eat each day</p>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>

        <div className="text-center">
          <button
            onClick={handleToday}
            className={`text-lg font-semibold text-gray-800 ${!isToday ? 'hover:text-green-600 transition-colors' : ''}`}
          >
            {formatDate(currentDate)}
          </button>
          {!isToday && (
            <p className="text-xs text-green-600 mt-0.5">Click to go to today</p>
          )}
        </div>

        <button
          onClick={handleNextDay}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Next day"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-green-500 animate-spin" />
        </div>
      )}

      {/* Meal Sections */}
      {!loading && (
        <>
          <div className="space-y-3 mb-6">
            {MEAL_CATEGORIES.map((category) => (
              <MealSection
                key={category}
                title={category}
                items={getCategoryItems(category)}
                subtotal={getCategorySubtotal(category)}
                onAddClick={() => handleOpenModal(category)}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>

          {/* Day Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Day Totals</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <TotalCard label="Calories" value={dayTotals.totalCalories} unit="kcal" color="text-orange-600" />
              <TotalCard label="Protein" value={dayTotals.totalProtein} unit="g" color="text-blue-600" />
              <TotalCard label="Carbs" value={dayTotals.totalCarbs} unit="g" color="text-amber-600" />
              <TotalCard label="Fat" value={dayTotals.totalFat} unit="g" color="text-rose-600" />
              <TotalCard label="Fibre" value={dayTotals.totalFibre} unit="g" color="text-emerald-600" />
            </div>
          </div>
        </>
      )}

      {/* Food Search Modal */}
      <FoodSearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddFood}
        mealCategory={activeCategory}
      />
    </div>
  );
}

function TotalCard({ label, value, unit, color }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">
        {label} <span className="text-gray-400">({unit})</span>
      </div>
    </div>
  );
}

export default LogMeal;