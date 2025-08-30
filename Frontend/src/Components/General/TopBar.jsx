import React from 'react';

// TopBar: mobile-first; optional menu button; accessible landmarks
const TopBar = ({ onSearch, searchTerm, modelVersion, onMenu }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 flex items-center gap-3 px-3 sm:px-4 h-14 md:h-16 shadow-sm" role="banner">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenu}
          className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-orange-50 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label="Toggle navigation"
        >☰</button>
        <div className="w-9 h-9 shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm" aria-label="Dhruv AI Logo">DA</div>
        <span className="hidden xs:block truncate font-semibold text-gray-800 text-sm sm:text-base">Dhruv AI Super Admin</span>
      </div>
      <div className="flex-1 min-w-[120px]" />
      <div className="relative w-40 sm:w-60 md:w-72">
        <input
          value={searchTerm}
          onChange={e => onSearch?.(e.target.value)}
          className="peer w-full h-9 rounded-md border border-gray-300 bg-gray-100 focus:bg-white focus:border-orange-500 focus:outline-none px-3 text-xs sm:text-sm transition-colors"
          placeholder="Search..."
          aria-label="Search"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">⌕</span>
      </div>
      <button
        className="hidden sm:inline-flex text-[11px] sm:text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
        aria-label="Model Version"
      >
        Model {modelVersion}
      </button>
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-[11px] sm:text-xs font-medium select-none" aria-label="User Avatar">SA</div>
    </header>
  );
};

export default TopBar;
