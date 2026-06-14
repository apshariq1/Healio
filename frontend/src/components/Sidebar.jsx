import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  TrendingUp,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/log', label: 'Meal Log', icon: ClipboardList },
  { to: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-primary-700">Healio</h1>
        <p className="text-xs text-gray-400 mt-0.5">Diet & Nutrition Planner</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}