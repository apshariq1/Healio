import React, { useState } from 'react';
import { Settings as SettingsIcon, Flame, Dumbbell, Scale, Apple, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

const ALLERGEN_OPTIONS = [
  'Gluten',
  'Dairy',
  'Eggs',
  'Nuts',
  'Soy',
  'Shellfish',
  'Fish',
  'Sesame',
];

const GOALS = [
  {
    id: 'Weight Loss',
    title: 'Weight Loss',
    description: 'Burn fat and feel lighter',
    icon: Flame,
  },
  {
    id: 'Muscle Gain',
    title: 'Muscle Gain',
    description: 'Build strength and muscle',
    icon: Dumbbell,
  },
  {
    id: 'Maintenance',
    title: 'Maintenance',
    description: 'Stay healthy and stable',
    icon: Scale,
  },
  {
    id: 'Clean Eating',
    title: 'Clean Eating',
    description: 'Eat whole, unprocessed foods',
    icon: Apple,
  },
];

function StatBox({ label, value, unit }) {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl py-3 px-2">
      <span className="text-lg font-bold text-gray-900">{value ?? '—'}</span>
      <span className="text-xs text-gray-500 text-center">{label}</span>
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </div>
  );
}

export function Settings() {
  const { user, setUser } = useAuth();

  // ── Card 1: Personal Information ────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    weight: user?.weight ?? '',
    height: user?.height ?? '',
    age: user?.age ?? '',
    gender: user?.gender ?? '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileTargets, setProfileTargets] = useState(null);

  // ── Card 2: Health Goal ──────────────────────────────────────────────────
  const [selectedGoal, setSelectedGoal] = useState(user?.healthGoal ?? '');
  const [goalChanged, setGoalChanged] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalTargets, setGoalTargets] = useState(null);

  // ── Card 3: Dietary Restrictions ────────────────────────────────────────
  const [selectedAllergens, setSelectedAllergens] = useState(
    user?.allergies ? [...user.allergies] : []
  );
  const [customAllergen, setCustomAllergen] = useState('');
  const [savingAllergies, setSavingAllergies] = useState(false);

  // ── Profile helpers ──────────────────────────────────────────────────────
  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateProfile = () => {
    const errs = {};
    if (!profile.name.trim()) errs.name = 'Name is required';
    if (!profile.weight || isNaN(Number(profile.weight)) || Number(profile.weight) <= 0) {
      errs.weight = 'Enter a valid weight in kg';
    }
    if (!profile.height || isNaN(Number(profile.height)) || Number(profile.height) <= 0) {
      errs.height = 'Enter a valid height in cm';
    }
    if (!profile.age || isNaN(Number(profile.age)) || Number(profile.age) <= 0 || Number(profile.age) > 120) {
      errs.age = 'Enter a valid age';
    }
    if (!profile.gender) {
      errs.gender = 'Please select a gender';
    }
    return errs;
  };

  const handleSaveProfile = async () => {
    const errs = validateProfile();
    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setSavingProfile(true);
    const loadingToast = toast.loading('Saving profile…');

    try {
      const res = await api.put('/user/profile', {
        name: profile.name.trim(),
        weight: Number(profile.weight),
        height: Number(profile.height),
        age: Number(profile.age),
        gender: profile.gender,
      });

      const updatedUser = res.data;
      setUser(updatedUser);

      if (updatedUser.dailyCalorieTarget) {
        setProfileTargets({
          calories: updatedUser.dailyCalorieTarget,
          protein: updatedUser.dailyProtein,
          carbs: updatedUser.dailyCarbs,
          fat: updatedUser.dailyFat,
        });
      }

      toast.success('Profile saved!', { id: loadingToast });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save profile.';
      toast.error(msg, { id: loadingToast });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Goal helpers ─────────────────────────────────────────────────────────
  const handleGoalSelect = (goalId) => {
    setSelectedGoal(goalId);
    setGoalChanged(goalId !== user?.healthGoal);
    setGoalTargets(null);
  };

  const handleSaveGoal = async () => {
    if (!selectedGoal) {
      toast.error('Please select a health goal');
      return;
    }

    setSavingGoal(true);
    const loadingToast = toast.loading('Saving goal…');

    try {
      const res = await api.put('/user/goal', { healthGoal: selectedGoal });
      const updatedUser = res.data;
      setUser(updatedUser);

      if (updatedUser.dailyCalorieTarget) {
        setGoalTargets({
          calories: updatedUser.dailyCalorieTarget,
          protein: updatedUser.dailyProtein,
          carbs: updatedUser.dailyCarbs,
          fat: updatedUser.dailyFat,
        });
      }

      setGoalChanged(false);
      toast.success('Health goal saved!', { id: loadingToast });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save goal.';
      toast.error(msg, { id: loadingToast });
    } finally {
      setSavingGoal(false);
    }
  };

  // ── Allergen helpers ─────────────────────────────────────────────────────
  const toggleAllergen = (allergen) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  const addCustomAllergen = () => {
    const trimmed = customAllergen.trim();
    if (!trimmed) return;
    if (!selectedAllergens.includes(trimmed)) {
      setSelectedAllergens((prev) => [...prev, trimmed]);
    }
    setCustomAllergen('');
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomAllergen();
    }
  };

  const handleSaveAllergies = async () => {
    setSavingAllergies(true);
    const loadingToast = toast.loading('Saving dietary restrictions…');

    try {
      const res = await api.put('/user/allergies', { allergies: selectedAllergens });
      const updatedUser = res.data;
      if (updatedUser) setUser(updatedUser);

      toast.success('Recipe suggestions will update automatically.', { id: loadingToast });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save allergies.';
      toast.error(msg, { id: loadingToast });
    } finally {
      setSavingAllergies(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const targets = profileTargets ?? goalTargets;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-green-100 rounded-xl">
          <SettingsIcon size={22} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your profile and preferences</p>
        </div>
      </div>

      {/* ── Card 1: Personal Information ──────────────────────────────── */}
      <div className="bg-white shadow-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Personal Information</h2>
        <p className="text-sm text-gray-500 mb-5">Update your body metrics. Targets recalculate automatically.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              placeholder="Your name"
              className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                profileErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {profileErrors.name && <p className="mt-1 text-sm text-red-500">{profileErrors.name}</p>}
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age (years)</label>
            <input
              type="number"
              inputMode="numeric"
              value={profile.age}
              onChange={(e) => handleProfileChange('age', e.target.value)}
              placeholder="e.g. 28"
              className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                profileErrors.age ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {profileErrors.age && <p className="mt-1 text-sm text-red-500">{profileErrors.age}</p>}
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              value={profile.weight}
              onChange={(e) => handleProfileChange('weight', e.target.value)}
              placeholder="e.g. 70"
              className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                profileErrors.weight ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {profileErrors.weight && <p className="mt-1 text-sm text-red-500">{profileErrors.weight}</p>}
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={profile.height}
              onChange={(e) => handleProfileChange('height', e.target.value)}
              placeholder="e.g. 175"
              className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                profileErrors.height ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {profileErrors.height && <p className="mt-1 text-sm text-red-500">{profileErrors.height}</p>}
          </div>

          {/* Gender */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <div className="flex gap-4">
              {['Male', 'Female'].map((g) => (
                <label
                  key={g}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border rounded-lg cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-green-500 ${
                    profile.gender === g
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="settings-gender"
                    value={g}
                    checked={profile.gender === g}
                    onChange={() => handleProfileChange('gender', g)}
                    className="sr-only"
                  />
                  {g}
                </label>
              ))}
            </div>
            {profileErrors.gender && <p className="mt-1 text-sm text-red-500">{profileErrors.gender}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="w-full sm:w-auto px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {savingProfile ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Recalculated targets */}
        {profileTargets && (
          <div className="mt-5 grid grid-cols-4 gap-3">
            <StatBox label="Calories" value={profileTargets.calories} unit="kcal" />
            <StatBox label="Protein" value={profileTargets.protein} unit="g" />
            <StatBox label="Carbs" value={profileTargets.carbs} unit="g" />
            <StatBox label="Fat" value={profileTargets.fat} unit="g" />
          </div>
        )}
      </div>

      {/* ── Card 2: Health Goal ───────────────────────────────────────── */}
      <div className="bg-white shadow-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Health Goal</h2>
        <p className="text-sm text-gray-500 mb-5">Choose the goal that best fits your current journey.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {GOALS.map(({ id, title, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleGoalSelect(id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                selectedGoal === id
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon
                size={28}
                className={selectedGoal === id ? 'text-green-600' : 'text-gray-400'}
              />
              <span className="font-semibold text-sm">{title}</span>
              <span className="text-xs opacity-75">{description}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={handleSaveGoal}
            disabled={savingGoal || !goalChanged}
            className="w-full sm:w-auto px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {savingGoal ? 'Saving…' : 'Save Goal'}
          </button>
          {goalChanged && (
            <p className="text-sm text-gray-500">Save to apply your new goal.</p>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400 italic">Historical meal data is not affected.</p>

        {/* Recalculated targets */}
        {goalTargets && (
          <div className="mt-5 grid grid-cols-4 gap-3">
            <StatBox label="Calories" value={goalTargets.calories} unit="kcal" />
            <StatBox label="Protein" value={goalTargets.protein} unit="g" />
            <StatBox label="Carbs" value={goalTargets.carbs} unit="g" />
            <StatBox label="Fat" value={goalTargets.fat} unit="g" />
          </div>
        )}
      </div>

      {/* ── Card 3: Dietary Restrictions ─────────────────────────────── */}
      <div className="bg-white shadow-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Dietary Restrictions & Allergies</h2>
        <p className="text-sm text-gray-500 mb-5">
          Tell us what to avoid so we can personalise recipe suggestions.
        </p>

        {/* Selected chips */}
        {selectedAllergens.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedAllergens.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full"
              >
                {a}
                <button
                  type="button"
                  onClick={() => toggleAllergen(a)}
                  className="hover:text-green-900 focus:outline-none text-base leading-none"
                  aria-label={`Remove ${a}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Preset allergen chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {ALLERGEN_OPTIONS.map((allergen) => {
            const selected = selectedAllergens.includes(allergen);
            return (
              <button
                key={allergen}
                type="button"
                onClick={() => toggleAllergen(allergen)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  selected
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {allergen}
              </button>
            );
          })}
        </div>

        {/* Custom allergen input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add custom allergen…"
            value={customAllergen}
            onChange={(e) => setCustomAllergen(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          />
          <button
            type="button"
            onClick={addCustomAllergen}
            className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        <button
          type="button"
          onClick={handleSaveAllergies}
          disabled={savingAllergies}
          className="mt-5 w-full sm:w-auto px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {savingAllergies ? 'Saving…' : 'Save Restrictions'}
        </button>
      </div>
    </div>
  );
}