import React from 'react';

const MACRO_CONFIG = [
  { key: 'protein', label: 'Protein', color: 'bg-blue-500', unit: 'g' },
  { key: 'carbs', label: 'Carbs', color: 'bg-amber-500', unit: 'g' },
  { key: 'fat', label: 'Fat', color: 'bg-rose-500', unit: 'g' },
  { key: 'fibre', label: 'Fibre', color: 'bg-emerald-500', unit: 'g' },
];

export function MacroBars({ current = {}, target = {} }) {
  return (
    <div className="space-y-4">
      {MACRO_CONFIG.map(({ key, label, color, unit }) => {
        const cur = current[key] || 0;
        const tgt = target[key] || 0;
        const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;

        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="text-sm text-gray-500">
                {cur}{unit} / {tgt}{unit}
                {tgt > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({Math.round(pct)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}