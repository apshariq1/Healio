import React, { useState, useEffect, useCallback } from 'react';
import { Scale, TrendingUp, Target, Flame } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import toast from 'react-hot-toast';
import client from '../api/client';

function SkeletonBlock({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function getBmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (bmi < 25) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { label: 'Obese', color: 'text-red-600', bg: 'bg-red-50' };
}

function StatCard({ icon: Icon, label, value, sub, subColor = 'text-gray-500', loading }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className="bg-green-50 p-3 rounded-xl">
        <Icon className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        {loading ? (
          <SkeletonBlock className="h-7 w-20 mt-1" />
        ) : (
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        )}
        {sub && (
          <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function Progress() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [weightData, setWeightData] = useState([]);
  const [calorieData, setCalorieData] = useState([]);
  const [streak, setStreak] = useState(0);
  const [weightInput, setWeightInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [weightRes, calorieRes, streakRes, userRes] = await Promise.all([
        client.get('/progress/weight').catch(() => ({ data: { entries: [] } })),
        client.get('/progress/calories').catch(() => ({ data: [] })),
        client.get('/progress/streak').catch(() => ({ data: { streak: 0 } })),
        client.get('/auth/me').catch(() => ({ data: {} })),
      ]);

      const entries = Array.isArray(weightRes.data) ? weightRes.data : [];
      // Last 7, sorted ascending for chart
      setWeightData(
        [...entries]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-7)
          .map((e) => ({ date: formatDate(e.date), kg: e.weight }))
      );

      const days = Array.isArray(calorieRes.data) ? calorieRes.data : [];
      setCalorieData(
        [...days]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-7)
          .map((d) => ({ date: formatDate(d.date), kcal: d.calories }))
      );

      setStreak(streakRes.data?.streak ?? 0);
      const userData = userRes.data.user || userRes.data;
      setUser(userData || null);
    } catch {
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].kg : null;
  const bmi = latestWeight && user?.height
    ? (latestWeight / Math.pow(user.height / 100, 2)).toFixed(1)
    : null;
  const bmiCategory = bmi ? getBmiCategory(parseFloat(bmi)) : null;
  const calorieTarget = user?.dailyCalorieTarget || 2000;

  const handleLogWeight = async (e) => {
    e.preventDefault();
    const weight = parseFloat(weightInput);
    if (!weight || weight < 20 || weight > 500) {
      toast.error('Please enter a valid weight (20–500 kg)');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/progress/weight', { weight });
      toast.success('Weight logged!');
      setWeightInput('');
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to log weight';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const chartTooltipStyle = {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '0.75rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
        <p className="text-sm text-gray-500 mt-1">Track your weight and nutrition trends</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Scale}
          label="Current Weight"
          value={latestWeight ? `${latestWeight} kg` : '—'}
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="BMI"
          value={bmi || '—'}
          sub={bmiCategory ? bmiCategory.label : null}
          subColor={bmiCategory ? bmiCategory.color : 'text-gray-500'}
          loading={loading}
        />
        <StatCard
          icon={Target}
          label="Goal"
          value={user?.healthGoal ? user.healthGoal.replace(/([A-Z])/g, ' $1').trim() : '—'}
          loading={loading}
        />
        <StatCard
          icon={Flame}
          label="Logging Streak"
          value={`${streak} day${streak !== 1 ? 's' : ''}`}
          loading={loading}
        />
      </div>

      {/* BMI Category Badge (if bmi is known) */}
      {bmiCategory && (
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6 ${bmiCategory.bg} ${bmiCategory.color}`}>
          {bmiCategory.label}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weight Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Weight Trend
          </h2>
          {loading ? (
            <div className="h-52 flex items-end gap-1">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 bg-gray-100 rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : weightData.length > 0 ? (
            <ResponsiveContainer width="100%" height={208}>
              <BarChart data={weightData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" unit=" kg" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="kg" fill="#22c55e" radius={[6, 6, 0, 0]} name="kg" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No weight data yet
            </div>
          )}
        </div>

        {/* Calorie Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Calorie Trend
          </h2>
          {loading ? (
            <div className="h-52 flex items-end gap-1">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 bg-gray-100 rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : calorieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={208}>
              <LineChart data={calorieData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" unit=" kcal" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <ReferenceLine
                  y={calorieTarget}
                  stroke="#22c55e"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#22c55e' }}
                />
                <Line
                  type="monotone"
                  dataKey="kcal"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 3 }}
                  name="kcal"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No calorie data yet
            </div>
          )}
        </div>
      </div>

      {/* Log Weight Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Log Today's Weight
        </h2>
        <form onSubmit={handleLogWeight} className="flex gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="weight-input" className="block text-xs text-gray-500 mb-1">
              Weight (kg)
            </label>
            <input
              id="weight-input"
              type="number"
              step="0.1"
              min="20"
              max="500"
              placeholder="e.g. 72.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !weightInput}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            <Scale className="w-4 h-4" />
            {submitting ? 'Logging…' : "Log Today's Weight"}
          </button>
        </form>
      </div>
    </div>
  );
}