import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, BookmarkCheck, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import { RecipeCard } from '../components/RecipeCard';
import client from '../api/client';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-40 bg-gray-200 animate-pulse rounded-t-2xl" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="h-8 bg-gray-200 rounded-xl animate-pulse mt-2" />
      </div>
    </div>
  );
}

export function Recipes() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [suggestions, setSuggestions] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [userAllergies, setUserAllergies] = useState([]);

  const fetchSuggestions = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const res = await client.get('/recipes/suggest');
      setSuggestions(res.data || []);
      if (showToast) toast.success('Suggestions refreshed!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load suggestions';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSavedRecipes = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const res = await client.get('/recipes/saved');
      setSavedRecipes(res.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load saved recipes';
      toast.error(msg);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await client.get('/auth/me');
      const user = res.data;
      setUserAllergies(user.allergies || []);
    } catch {
      // non-critical, silently fail
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
    fetchUserProfile();
  }, [fetchSuggestions, fetchUserProfile]);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedRecipes();
    }
  }, [activeTab, fetchSavedRecipes]);

  const handleSaveRecipe = async (recipe) => {
    try {
      await client.post('/recipes/save', recipe);
      toast.success('Recipe saved!');
      // Update local state to mark as saved
      setSuggestions((prev) =>
        prev.map((r) =>
          r.spoonacularId === recipe.spoonacularId ? { ...r, saved: true } : r
        )
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save recipe';
      toast.error(msg);
    }
  };

  const handleRemoveRecipe = async (recipeId) => {
    try {
      await client.delete(`/recipes/saved/${recipeId}`);
      toast.success('Recipe removed');
      if (activeTab === 'saved') {
        setSavedRecipes((prev) => prev.filter((r) => r._id !== recipeId));
      } else {
        setSuggestions((prev) =>
          prev.map((r) =>
            r.spoonacularId === recipeId ? { ...r, saved: false } : r
          )
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove recipe';
      toast.error(msg);
    }
  };

  const handleViewRecipe = (sourceUrl) => {
    if (sourceUrl) {
      window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('No source URL available for this recipe');
    }
  };

  const renderCards = (recipes, isSavedTab = false) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    if (!recipes || recipes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ChefHat className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {isSavedTab ? 'No saved recipes yet' : 'No recipe suggestions available'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {isSavedTab
              ? 'Save recipes to see them here'
              : 'Check back later for personalized suggestions'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe._id || recipe.spoonacularId}
            recipe={recipe}
            isSaved={isSavedTab || !!recipe.saved}
            onSave={handleSaveRecipe}
            onRemove={handleRemoveRecipe}
            onView={handleViewRecipe}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Discover and save personalized meal ideas
        </p>
      </div>

      {/* Allergy chips */}
      {userAllergies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {userAllergies.map((allergy) => (
            <span
              key={allergy}
              className="text-xs font-medium px-3 py-1 rounded-full border border-green-300 bg-green-50 text-green-700"
            >
              {allergy}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'suggestions'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Suggestions
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'saved'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          Saved Recipes
        </button>
      </div>

      {/* Suggestions tab */}
      {activeTab === 'suggestions' && (
        <>
          {/* Refresh button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => fetchSuggestions(true)}
              disabled={loading}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Suggestions
            </button>
          </div>
          {renderCards(suggestions, false)}
        </>
      )}

      {/* Saved tab */}
      {activeTab === 'saved' && (
        <>
          {loadingSaved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            renderCards(savedRecipes, true)
          )}
        </>
      )}
    </div>
  );
}