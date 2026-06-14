import React, { useState, useEffect } from 'react';
import { GlassWater, Plus, Minus } from 'lucide-react';

function getTodayKey() {
  const today = new Date();
  return `healio-water-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const MAX_GLASSES = 12;

export function WaterTracker() {
  const [glasses, setGlasses] = useState(0);

  useEffect(() => {
    const todayKey = getTodayKey();
    const saved = localStorage.getItem(todayKey);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= MAX_GLASSES) {
        setGlasses(parsed);
      }
    }
  }, []);

  const persist = (count) => {
    setGlasses(count);
    localStorage.setItem(getTodayKey(), String(count));
  };

  const increment = () => {
    if (glasses < MAX_GLASSES) persist(glasses + 1);
  };

  const decrement = () => {
    if (glasses > 0) persist(glasses - 1);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <GlassWater className="w-5 h-5 text-blue-500" />
        <span className="text-sm font-medium text-gray-700">
          Water
        </span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <button
          onClick={decrement}
          disabled={glasses === 0}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          aria-label="Remove glass"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900 w-20 text-center">
          {glasses} / {MAX_GLASSES} glasses
        </span>
        <button
          onClick={increment}
          disabled={glasses >= MAX_GLASSES}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          aria-label="Add glass"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}