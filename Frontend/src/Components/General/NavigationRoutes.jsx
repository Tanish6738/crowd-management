import React from 'react';
import { NavLink } from 'react-router-dom';

// Simple navigation hub to jump between different dashboard roles
const NavigationRoutes = () => {
  const links = [
    { to: '/superAdminDashboard', label: 'Super Admin' },
    { to: '/adminDashboard', label: 'Admin' },
    { to: '/volunteerDashboard', label: 'Volunteer' },
    { to: '/userDashboard', label: 'User' },
  ];

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
      <nav aria-label="Main navigation" className="w-full max-w-md">
        <h1 className="text-center text-lg font-semibold text-gray-800 mb-6">Select Portal</h1>
        <ul className="space-y-3">
          {links.map(l => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) => `block px-5 py-3 rounded-md border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${isActive ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-400 hover:text-orange-600'}`}
              >
                {l.label} Dashboard
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default NavigationRoutes;