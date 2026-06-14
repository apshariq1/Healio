import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  TrendingUp,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/log', label: 'Log', icon: ClipboardList },
  { to: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  return (
    <nav className="h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 shadow-lg">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-primary-600' : 'text-gray-400'
            }`
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}