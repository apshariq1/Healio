import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

export function Login() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const isGoogleConfigured = import.meta.env.VITE_GOOGLE_CLIENT_ID && !import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('your-google-client-id');

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    }
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid email or password';
      toast.error(msg);
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('invalid')) {
        setErrors({ email: msg });
      } else {
        setErrors({ password: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* OAuth divider and Google button */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400">or continue with</span>
          </div>
        </div>

        {isGoogleConfigured ? (
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                await googleLogin(credentialResponse.credential);
                toast.success('Signed in with Google');
                navigate('/dashboard');
              } catch (err) {
                toast.error('Google sign-in failed');
              }
            }}
            onError={() => toast.error('Google sign-in failed')}
            text="signin_with"
            shape="rectangular"
            width="100%"
          />
        ) : (
          <p className="text-xs text-center text-gray-400 py-2 border border-gray-200 rounded-lg">
            🔧 Google Sign-In not configured. Set <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="bg-gray-100 px-1 rounded">frontend/.env</code>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-green-600 hover:text-green-700 hover:underline font-medium"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}