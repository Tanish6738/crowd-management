import React from 'react';

// Sidebar: supports mobile slide-over via mobileOpen prop (controlled by parent)
const Sidebar = ({ tabs, active, onChange, mobileOpen = false, onClose }) => {
  return (
    <>
      {/* Desktop / large */}
      <nav className="hidden sm:flex flex-col w-48 md:w-56 border-r border-gray-200 bg-white" aria-label="Primary">
        <ul className="flex-1 py-4 space-y-1">
          {tabs.map(t => {
            const isActive = t.key === active;
            return (
              <li key={t.key}>
                <button
                  onClick={() => onChange(t.key)}
                  className={`w-full text-left px-4 py-2 rounded-r-full transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-white ${isActive ? 'bg-orange-500 text-white shadow' : 'hover:bg-orange-50 text-gray-700'}`}
                  aria-current={isActive ? 'page' : undefined}
                >{t.label}</button>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Mobile slide-over (only rendered when open) */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <nav className="absolute left-0 top-0 h-full w-64 max-w-[80%] bg-white border-r border-gray-200 shadow-xl flex flex-col" aria-label="Primary Mobile">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-800">Navigation</span>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded" aria-label="Close menu">✕</button>
            </div>
            <ul className="flex-1 py-4 space-y-1 overflow-y-auto">
              {tabs.map(t => {
                const isActive = t.key === active;
                return (
                  <li key={t.key}>
                    <button
                      onClick={() => { onChange(t.key); onClose?.(); }}
                      className={`w-full text-left px-4 py-2 rounded-md transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-white ${isActive ? 'bg-orange-500 text-white shadow' : 'hover:bg-orange-50 text-gray-700'}`}
                      aria-current={isActive ? 'page' : undefined}
                    >{t.label}</button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
};

export default Sidebar;
