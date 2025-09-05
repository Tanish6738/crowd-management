import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../Context/ThemeContext';
import data from '../../Data/data.json';
import { useUser, UserButton, SignedIn, SignedOut } from '@clerk/clerk-react';

const getCurrentUser = () => {
  if (data.superAdmin && data.superAdmin.length) return { role: 'superAdmin' };
  if (data.admins && data.admins.length) return { role: 'admin' };
  if (data.volunteers && data.volunteers.length) return { role: 'volunteer' };
  return { role: 'user' };
};

const roleToLinks = {
  superAdmin: [
    { to: '/', label: 'Home' },
    { to: '/superAdminDashboard', label: 'Super Admin' },
    { to: '/adminDashboard', label: 'Admin' },
    { to: '/volunteerDashboard', label: 'Volunteer' },
    { to: '/userDashboard', label: 'User' },
  ],
  admin: [
    { to: '/', label: 'Home' },
    { to: '/adminDashboard', label: 'Admin' },
    { to: '/volunteerDashboard', label: 'Volunteer' },
    { to: '/userDashboard', label: 'User' },
  ],
  volunteer: [
    { to: '/', label: 'Home' },
    { to: '/volunteerDashboard', label: 'Volunteer' },
    { to: '/userDashboard', label: 'User' },
  ],
  user: [
    { to: '/', label: 'Home' },
    { to: '/userDashboard', label: 'User' },
  ],
  guest: [{ to: '/', label: 'Home' }],
};

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const [currentRole, setCurrentRole] = useState('guest');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const metaRole = user.publicMetadata?.role;
      if (typeof metaRole === 'string') {
        setCurrentRole(metaRole);
        return;
      }
    }
    const fallback = getCurrentUser();
    setCurrentRole(fallback.role || 'guest');
  }, [user]);

  const links = useMemo(
    () => roleToLinks[currentRole] || roleToLinks.guest,
    [currentRole]
  );

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => (document.body.style.overflow = prev);
    }
  }, [mobileOpen]);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        {/* Logo */}
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-wide">
          CrowdMgmt
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {theme === 'dark' ? '🌞 Light' : '🌙 Dark'}
          </button>
          <SignedOut>
            <button
              onClick={() => navigate('/sign-in')}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </button>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize hidden sm:inline">
                {currentRole}
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50">
          <nav className="fixed top-0 left-0 w-64 h-full bg-white dark:bg-gray-900 shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Menu
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="border-t pt-4 space-y-3">
              <button
                onClick={toggleTheme}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {theme === 'dark' ? '🌞 Light Theme' : '🌙 Dark Theme'}
              </button>
              <SignedOut>
                <button
                  onClick={() => navigate('/sign-in')}
                  className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sign In
                </button>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {currentRole}
                  </span>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
