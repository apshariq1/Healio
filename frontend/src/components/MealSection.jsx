import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Pencil, Trash } from 'lucide-react';

export function MealSection({ title, items, subtotal, onAddClick, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {isExpanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{subtotal}</span> kcal
          </span>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Add Food Button */}
          <button
            onClick={onAddClick}
            className="w-full py-2 mb-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Food
          </button>

          {/* Items List */}
          {items.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">
              No foods logged for {title.toLowerCase()}
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <MealItemRow
                  key={item._id || item.foodId}
                  item={item}
                  category={title.toLowerCase()}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MealItemRow({ item, category, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(item.quantity || 100);
  const [editUnit, setEditUnit] = useState(item.unit || 'g');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onEdit(item, { quantity: editQty, unit: editUnit }, category);
    setIsEditing(false);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditQty(item.quantity || 100);
    setEditUnit(item.unit || 'g');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex-1">
          <p className="font-medium text-gray-800 text-sm mb-1">{item.label}</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={editQty}
              onChange={(e) => setEditQty(Number(e.target.value))}
              min="1"
              className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <select
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="g">g</option>
              <option value="serving">serving</option>
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium transition-colors disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm truncate">{item.label}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          <span>
            {item.quantity} {item.unit}
          </span>
          <span className="text-orange-600 font-medium">{item.calories} kcal</span>
          <span className="hidden xs:inline">
            <span className="text-blue-500">P:{item.protein}g</span>
            {' / '}
            <span className="text-amber-500">C:{item.carbs}g</span>
            {' / '}
            <span className="text-rose-500">F:{item.fat}g</span>
            {' / '}
            <span className="text-emerald-500">Fi:{item.fibre}g</span>
          </span>
          {/* Compact macro display for mobile */}
          <span className="xs:hidden text-blue-500">
            P:{item.protein} C:{item.carbs} F:{item.fat}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Edit item"
        >
          <Pencil size={14} className="text-gray-500" />
        </button>
        <button
          onClick={() => onDelete(item, category)}
          className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
          aria-label="Delete item"
        >
          <Trash size={14} className="text-red-500" />
        </button>
      </div>
    </div>
  );
}

export default MealSection;