import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../Context/ThemeContext';
import data from '../../Data/data.json';
import { useUser, UserButton, SignedIn, SignedOut } from '@clerk/clerk-react';

/*
  Professional Navbar
  - Theme aware (dark/light) using token utilities.
  - Distinct primary actions (Sign In / Dashboard).
  - Accessible: focus styles, aria labels and reduced motion respect.
  - Collapsible mobile navigation with slide panel.
*/

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
  ],
  admin: [
    { to: '/', label: 'Home' },
    { to: '/adminDashboard', label: 'Admin' },
    { to: '/volunteerDashboard', label: 'Volunteer' },
  ],
  volunteer: [
    { to: '/', label: 'Home' },
    { to: '/volunteerDashboard', label: 'Volunteer' },
  ],
  user: [
    { to: '/', label: 'Home' },
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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[rgba(10,20,35,0.65)] dark:bg-[rgba(10,20,35,0.65)] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-6">
        {/* Left cluster */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden mk-btn-tab !px-3 !py-2"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
          <NavLink to="/" className="flex items-center gap-2 group">
            <span className="text-base font-bold tracking-wide mk-text-primary group-hover:mk-accent transition">DhruvAi</span>
            <span className="mk-badge mk-badge-accent text-[9px]">Live</span>
          </NavLink>
          <nav className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `mk-btn-tab ${isActive? 'mk-btn-tab-active':''}`}
              >{l.label}</NavLink>
            ))}
          </nav>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="mk-btn-tab !text-[11px]"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <SignedOut>
            <button
              onClick={()=> navigate('/sign-in')}
              className="mk-btn-tab mk-btn-tab-active !text-[11px]"
            >Sign In</button>
            <button
              onClick={()=> navigate('/sign-up')}
              className="mk-btn-tab !text-[11px] hidden sm:inline-flex"
            >Register</button>
          </SignedOut>
          <SignedIn>
            <span className="hidden sm:inline-flex text-[11px] mk-text-muted capitalize mr-1">{currentRole}</span>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>

      {/* Mobile slide-out */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition ${mobileOpen? 'pointer-events-auto':'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${mobileOpen? 'opacity-100':'opacity-0'}`}
          onClick={()=> setMobileOpen(false)}
        />
        <nav
          className={`absolute top-0 left-0 h-full w-72 bg-[rgba(14,32,51,0.95)] border-r border-white/10 pt-6 pb-10 flex flex-col gap-4 translate-x-${mobileOpen? '0':'[-100%]'} transition-all duration-300`}
        >
          <div className="px-6 flex items-center justify-between mb-2">
            <span className="text-sm font-semibold tracking-wide">Navigation</span>
            <button onClick={()=> setMobileOpen(false)} className="mk-btn-tab !px-2 !py-1">✕</button>
          </div>
          <div className="px-4 space-y-2 overflow-y-auto flex-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `block mk-route-card px-4 py-3 text-sm font-medium ${isActive? 'mk-route-card-active':''}`}
              >{l.label}</NavLink>
            ))}
          </div>
          <div className="mt-auto px-4 pt-4 border-t border-white/10 space-y-3">
            <button onClick={toggleTheme} className="w-full mk-btn-tab !justify-center">{theme === 'dark'? 'Light Theme':'Dark Theme'}</button>
            <SignedOut>
              <button onClick={()=> navigate('/sign-in')} className="w-full mk-btn-tab mk-btn-tab-active !justify-center">Sign In</button>
              <button onClick={()=> navigate('/sign-up')} className="w-full mk-btn-tab !justify-center">Register</button>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center justify-between text-[11px] mk-text-muted px-1">
                <span className="capitalize">{currentRole}</span>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
