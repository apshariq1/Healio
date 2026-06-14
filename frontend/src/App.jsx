import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { LogMeal } from './pages/LogMeal';
import { Recipes } from './pages/Recipes';
import { Progress } from './pages/Progress';
import { Settings } from './pages/Settings';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes with layout */}
      <Route
        path="/onboarding"
        element={
          <PrivateRoute>
            <Layout>
              <Onboarding />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/log"
        element={
          <PrivateRoute>
            <Layout>
              <LogMeal />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/log/:date"
        element={
          <PrivateRoute>
            <Layout>
              <LogMeal />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <PrivateRoute>
            <Layout>
              <Recipes />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <PrivateRoute>
            <Layout>
              <Progress />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Layout>
              <Settings />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;