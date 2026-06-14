import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Flame, Dumbbell, Scale, Apple, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

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

const TOTAL_STEPS = 3;

export function Onboarding() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // Step 1 — Body metrics
  const [metrics, setMetrics] = useState({ weight: '', height: '', age: '', gender: '' });
  const [metricsErrors, setMetricsErrors] = useState({});

  // Step 2 — Health goal
  const [selectedGoal, setSelectedGoal] = useState('');

  // Step 3 — Allergies
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [customAllergen, setCustomAllergen] = useState('');

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // ─── Step 1 validation ───────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs = {};
    if (!metrics.weight || isNaN(Number(metrics.weight)) || Number(metrics.weight) <= 0) {
      errs.weight = 'Enter a valid weight in kg';
    }
    if (!metrics.height || isNaN(Number(metrics.height)) || Number(metrics.height) <= 0) {
      errs.height = 'Enter a valid height in cm';
    }
    if (!metrics.age || isNaN(Number(metrics.age)) || Number(metrics.age) <= 0 || Number(metrics.age) > 120) {
      errs.age = 'Enter a valid age';
    }
    if (!metrics.gender) {
      errs.gender = 'Please select a gender';
    }
    return errs;
  };

  const handleMetricsChange = (field, value) => {
    setMetrics((prev) => ({ ...prev, [field]: value }));
    setMetricsErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ─── Navigation ──────────────────────────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length > 0) {
        setMetricsErrors(errs);
        return;
      }
    }
    if (step === 2 && !selectedGoal) {
      toast.error('Please select a health goal');
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  // ─── Allergen helpers ────────────────────────────────────────────────────
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

  // ─── Finish ──────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    setSubmitting(true);
    const loadingToast = toast.loading('Setting up your profile…');

    try {
      // 1. Profile
      await api.put('/user/profile', {
        weight: Number(metrics.weight),
        height: Number(metrics.height),
        age: Number(metrics.age),
        gender: metrics.gender,
      });

      // 2. Goal
      await api.put('/user/goal', { healthGoal: selectedGoal });

      // 3. Allergies
      await api.put('/user/allergies', { allergies: selectedAllergens });

      // Refresh user in context
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch {
        // non-fatal
      }

      toast.success('Profile set up! Welcome to Healio.', { id: loadingToast });
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Something went wrong. Please try again.';
      toast.error(msg, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-lg p-6 sm:p-8">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
              {s < TOTAL_STEPS && (
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    s < step ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-1">
          Step {step} of {TOTAL_STEPS}
        </p>

        {/* ── Step 1: Body Metrics ───────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Body Metrics</h2>
            <p className="text-gray-500 text-sm mb-6">
              Help us calculate your daily nutrition targets.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 70"
                    value={metrics.weight}
                    onChange={(e) => handleMetricsChange('weight', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                      metricsErrors.weight ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {metricsErrors.weight && (
                    <p className="mt-1 text-sm text-red-500">{metricsErrors.weight}</p>
                  )}
                </div>

                {/* Height */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 175"
                    value={metrics.height}
                    onChange={(e) => handleMetricsChange('height', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                      metricsErrors.height ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {metricsErrors.height && (
                    <p className="mt-1 text-sm text-red-500">{metricsErrors.height}</p>
                  )}
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age (years)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 28"
                  value={metrics.age}
                  onChange={(e) => handleMetricsChange('age', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                    metricsErrors.age ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {metricsErrors.age && (
                  <p className="mt-1 text-sm text-red-500">{metricsErrors.age}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <div className="flex gap-4">
                  {['Male', 'Female'].map((g) => (
                    <label
                      key={g}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border rounded-lg cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-green-500 ${
                        metrics.gender === g
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={metrics.gender === g}
                        onChange={() => handleMetricsChange('gender', g)}
                        className="sr-only"
                      />
                      {g}
                    </label>
                  ))}
                </div>
                {metricsErrors.gender && (
                  <p className="mt-1 text-sm text-red-500">{metricsErrors.gender}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Health Goal ─────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Health Goal</h2>
            <p className="text-gray-500 text-sm mb-6">
              What are you working towards?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {GOALS.map(({ id, title, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedGoal(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
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
                  <span className="text-xs text-center opacity-75">{description}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Dietary Restrictions ────────────────────────────────── */}
        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Dietary Restrictions
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Select any allergens or sensitivities. You can add custom ones below.
            </p>

            {/* Selected chips */}
            {selectedAllergens.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedAllergens.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      className="hover:text-green-900 focus:outline-none"
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
          </>
        )}

        {/* ── Navigation buttons ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="flex items-center gap-1 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {submitting ? 'Finishing…' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}