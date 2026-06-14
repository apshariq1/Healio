import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import api from '../api/client';

export function FoodSearchModal({ isOpen, onClose, onAdd, mealCategory }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const debounceRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedFood(null);
      setQuantity(100);
      setUnit('g');
      setLoading(false);
      setSearchLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/food/search?query=${encodeURIComponent(query)}`);
        setResults(res.data.results || []);
        if (res.data.source === 'demo') {
          setSearchStatus(res.data.message || 'Showing demo foods — Edamam API unavailable');
        } else {
          setSearchStatus('');
        }
      } catch (err) {
        setResults([]);
        setSearchStatus(err.response?.data?.message || 'Search unavailable — check backend connection');
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleResultClick = (food) => {
    setSelectedFood(food);
    setQuantity(100);
    setUnit('g');
  };

  const calculateNutrition = () => {
    if (!selectedFood) return { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
    const multiplier = unit === 'g' ? quantity / 100 : quantity;
    return {
      calories: Math.round((selectedFood.calories || 0) * multiplier),
      protein: Math.round((selectedFood.protein || 0) * multiplier * 10) / 10,
      carbs: Math.round((selectedFood.carbs || 0) * multiplier * 10) / 10,
      fat: Math.round((selectedFood.fat || 0) * multiplier * 10) / 10,
      fibre: Math.round((selectedFood.fibre || 0) * multiplier * 10) / 10,
    };
  };

  const handleAddToMeal = () => {
    if (!selectedFood) return;
    const scaledItem = {
      label: selectedFood.label,
      calories: calculateNutrition().calories,
      protein: calculateNutrition().protein,
      carbs: calculateNutrition().carbs,
      fat: calculateNutrition().fat,
      fibre: calculateNutrition().fibre,
      quantity: quantity,
      unit: unit,
      mealCategory,
    };
    onAdd(scaledItem);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Search Food</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods (e.g. banana, chicken...)"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              autoFocus
            />
            {searchLoading && (
              <Loader2
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
              />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedFood ? (
            /* Search Results */
            <div className="space-y-2">
              {searchStatus && (
                <p className="text-center text-amber-600 bg-amber-50 rounded-lg py-2 px-3 text-xs mb-2">
                  {searchStatus}
                </p>
              )}
              {results.length === 0 && query.trim() && !searchLoading && (
                <p className="text-center text-gray-500 py-8 text-sm">
                  No foods found for "{query}"
                </p>
              )}
              {results.length === 0 && !query.trim() && (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Start typing to search for foods
                </p>
              )}
              {results.map((food, idx) => (
                <button
                  key={food.foodId || idx}
                  onClick={() => handleResultClick(food)}
                  className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <div className="font-medium text-gray-800 text-sm">{food.label}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="text-orange-600 font-medium">
                      {food.calories || 0} kcal/100g
                    </span>
                    <span>P: {food.protein || 0}g</span>
                    <span>C: {food.carbs || 0}g</span>
                    <span>F: {food.fat || 0}g</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Food Detail Panel */
            <div>
              <button
                onClick={() => setSelectedFood(null)}
                className="text-sm text-green-600 hover:text-green-700 mb-3 flex items-center gap-1"
              >
                ← Back to results
              </button>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-gray-800 text-base mb-3">
                  {selectedFood.label}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Calories</span>
                    <span className="font-medium text-gray-800">
                      {selectedFood.calories || 0} kcal
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Protein</span>
                    <span className="font-medium text-gray-800">
                      {selectedFood.protein || 0}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Carbs</span>
                    <span className="font-medium text-gray-800">
                      {selectedFood.carbs || 0}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fat</span>
                    <span className="font-medium text-gray-800">
                      {selectedFood.fat || 0}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fibre</span>
                    <span className="font-medium text-gray-800">
                      {selectedFood.fibre || 0}g
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">* Per 100g</p>
              </div>

              {/* Quantity Inputs */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="g">grams (g)</option>
                    <option value="serving">serving</option>
                  </select>
                </div>
              </div>

              {/* Calculated Nutrition Preview */}
              <div className="bg-green-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-2">Nutrition for {quantity} {unit}</p>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      {calculateNutrition().calories}
                    </div>
                    <div className="text-xs text-gray-500">kcal</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-blue-600">
                      {calculateNutrition().protein}g
                    </div>
                    <div className="text-xs text-gray-500">Protein</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-600">
                      {calculateNutrition().carbs}g
                    </div>
                    <div className="text-xs text-gray-500">Carbs</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rose-600">
                      {calculateNutrition().fat}g
                    </div>
                    <div className="text-xs text-gray-500">Fat</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-600">
                      {calculateNutrition().fibre}g
                    </div>
                    <div className="text-xs text-gray-500">Fibre</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddToMeal}
                disabled={loading || !quantity}
                className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Add to Meal'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoodSearchModal;