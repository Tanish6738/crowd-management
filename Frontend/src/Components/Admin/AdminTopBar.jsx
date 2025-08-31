import React from 'react';

const AdminTopBar = ({ zoneFilter, setZoneFilter, zones, live, setLive, search, setSearch, alertCount, onMenu, onAlertsClick }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0d1117]/85 backdrop-blur-xl border-b border-white/10 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-14 md:h-16 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]" role="banner">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenu}
          className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          aria-label="Toggle navigation"
        >☰</button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-inner ring-1 ring-white/20" aria-label="Dhruv AI Logo">DA</div>
      </div>
      <select
        value={zoneFilter}
        onChange={e => setZoneFilter(e.target.value)}
        className="h-9 text-xs sm:text-sm rounded-md border border-white/10 bg-white/5 text-white/80 px-2 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        aria-label="Zone Filter"
      >
        <option className="bg-gray-900" value="all">All Zones</option>
        {zones.map(z => <option className="bg-gray-900" key={z.id} value={z.id}>{z.name}</option>)}
      </select>
      <button
        onClick={() => setLive(l => !l)}
        className={`h-9 px-3 rounded-md text-xs font-medium border transition-colors ${live ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
        aria-pressed={live}
        aria-label="Live or History toggle"
      >{live ? 'Live' : 'History'}</button>
      <div className="relative w-32 sm:w-56 md:w-72 ml-auto">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 rounded-md border border-white/10 bg-white/5 text-xs sm:text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 px-3"
          placeholder="Search..."
          aria-label="Search"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">⌕</span>
      </div>
      <button
        onClick={onAlertsClick}
        className="relative w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        aria-label={`Alerts (${alertCount})`}
      >
        🔔
        {alertCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-semibold shadow">{alertCount}</span>}
      </button>
      <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[11px] font-medium text-white/70" aria-label="User Menu">AD</div>
    </header>
  );
};

export default AdminTopBar;
