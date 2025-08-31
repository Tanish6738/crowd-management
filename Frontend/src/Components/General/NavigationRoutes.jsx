import React from "react";
import { NavLink } from "react-router-dom";

// Simple navigation hub to jump between different dashboard roles
const NavigationRoutes = () => {
  const links = [
    { to: "/superAdminDashboard", label: "Super Admin" },
    { to: "/adminDashboard", label: "Admin" },
    { to: "/volunteerDashboard", label: "Volunteer" },
    { to: "/userDashboard", label: "User" },
  ];

  return (
    <div className="mk-gradient-bg min-h-dvh flex items-center justify-center px-4 py-10">
      <nav
        aria-label="Main navigation"
        className="w-full max-w-lg mk-animate-in"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mk-text-primary tracking-tight">
            Select Portal
          </h1>
          <p className="text-xs mt-2 mk-text-muted">
            Choose the dashboard experience you want to explore.
          </p>
        </div>
        <ul className="grid md:grid-cols-2 gap-4">
          {links.map((l) => (
            <li key={l.to} className="relative">
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `mk-route-card block px-5 py-4 focus:outline-none group ${isActive ? "mk-route-card-active" : ""}`
                }
              >
                <span className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium tracking-wide uppercase mk-text-secondary group-hover:mk-text-primary">
                    {l.label}
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.55)] group-hover:text-[rgba(255,255,255,0.8)]">
                    Dash
                  </span>
                </span>
                <span className="block text-[11px] leading-relaxed mk-text-muted group-hover:mk-text-secondary pr-4">
                  Access {l.label.toLowerCase()} domain features & controls.
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default NavigationRoutes;
