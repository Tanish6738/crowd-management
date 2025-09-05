import React from 'react';

// Sidebar: supports mobile slide-over via mobileOpen prop (controlled by parent)
const Sidebar = ({ tabs, active, onChange, mobileOpen = false, onClose }) => {
  return (
    <>
      {/* Desktop / large */}
  <nav className="hidden sm:flex flex-col w-52 md:w-60 border-r mk-divider mk-surface-alt backdrop-blur-xl" aria-label="Primary">
        <div className="px-4 pt-5 pb-3 text-[11px] uppercase tracking-[2px] mk-text-muted font-semibold">Navigation</div>
        <ul className="flex-1 px-3 space-y-1">
          {tabs.map(t => {
            const isActive = t.key === active;
            return (
              <li key={t.key}>
                <button
                  onClick={() => onChange(t.key)}
                  className={`mk-btn-tab w-full justify-start ${isActive ? 'mk-btn-tab-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >{t.label}</button>
              </li>
            );
          })}
        </ul>
        <div className="p-4 text-[10px] mk-text-muted/70 border-t mk-divider tracking-wide">© {new Date().getFullYear()} Dhruv AI</div>
      </nav>
      {/* Mobile slide-over (only rendered when open) */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 theme-light:bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <nav className="absolute left-0 top-0 h-full w-72 max-w-[84%] mk-panel flex flex-col" aria-label="Primary Mobile">
            <div className="px-5 pt-5 pb-4 border-b mk-divider flex items-center justify-between">
              <span className="font-semibold text-sm mk-text-primary">Navigation</span>
              <button onClick={onClose} className="mk-btn-tab px-3 py-1 rounded-full h-8" aria-label="Close menu">✕</button>
            </div>
            <ul className="flex-1 py-5 px-4 space-y-2 overflow-y-auto">
              {tabs.map(t => {
                const isActive = t.key === active;
                return (
                  <li key={t.key}>
                    <button
                      onClick={() => { onChange(t.key); onClose?.(); }}
                      className={`mk-btn-tab w-full justify-start ${isActive ? 'mk-btn-tab-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >{t.label}</button>
                  </li>
                );
              })}
            </ul>
            <div className="p-4 text-[10px] mk-text-muted/70 border-t mk-divider tracking-wide">© {new Date().getFullYear()} Dhruv AI</div>
          </nav>
        </div>
      )}
    </>
  );
};

export default Sidebar;
