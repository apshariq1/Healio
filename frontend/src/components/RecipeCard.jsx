import React from 'react';
import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';

export function RecipeCard({ recipe, isSaved, onSave, onRemove, onView }) {
  const { title, image, calories, protein, carbs, fat, sourceUrl } = recipe;

  const handleBookmarkClick = () => {
    if (isSaved) {
      onRemove(recipe._id || recipe.spoonacularId);
    } else {
      onSave(recipe);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative">
        <img
          src={image || 'https://via.placeholder.com/400x200?text=No+Image'}
          alt={title}
          className="w-full h-40 object-cover rounded-t-2xl"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
          }}
        />
        {/* Calorie badge */}
        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
          {Math.round(calories || 0)} kcal
        </div>
        {/* Bookmark button */}
        <button
          onClick={handleBookmarkClick}
          className="absolute top-3 left-3 bg-white/90 hover:bg-white text-green-600 p-1.5 rounded-full shadow-sm transition-colors"
          aria-label={isSaved ? 'Remove from saved' : 'Save recipe'}
        >
          {isSaved ? (
            <BookmarkCheck className="w-4 h-4" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-sm mb-3 line-clamp-2">
          {title}
        </h3>

        {/* Macro badges */}
        <div className="flex gap-2 mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            P {Math.round(protein || 0)}g
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            C {Math.round(carbs || 0)}g
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            F {Math.round(fat || 0)}g
          </span>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <button
            onClick={() => onView(sourceUrl)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-xl border border-green-500 text-green-600 hover:bg-green-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Recipe
          </button>
          {isSaved && (
            <button
              onClick={() => onRemove(recipe._id || recipe.spoonacularId)}
              className="text-xs font-medium py-2 px-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}