import React from 'react';

const AdminTopBar = ({ zoneFilter, setZoneFilter, zones, live, setLive, search, setSearch, alertCount, onMenu, onAlertsClick }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-14 md:h-16 shadow-sm" role="banner">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onMenu} className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-orange-50 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500" aria-label="Toggle navigation">☰</button>
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm" aria-label="Dhruv AI Logo">DA</div>
      </div>
      <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} className="h-9 text-xs sm:text-sm rounded-md border border-gray-300 bg-white px-2 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500" aria-label="Zone Filter">
        <option value="all">All Zones</option>
        {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
      </select>
      <button onClick={() => setLive(l => !l)} className={`h-9 px-3 rounded-md text-xs font-medium border transition-colors ${live ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50'}`} aria-pressed={live} aria-label="Live or History toggle">{live ? 'Live' : 'History'}</button>
      <div className="relative w-32 sm:w-56 md:w-72 ml-auto">
        <input value={search} onChange={e => setSearch(e.target.value)} className="w-full h-9 rounded-md border border-gray-300 bg-gray-100 focus:bg-white focus:border-orange-500 focus:outline-none px-3 text-xs sm:text-sm" placeholder="Search..." aria-label="Search" />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">⌕</span>
      </div>
  <button onClick={onAlertsClick} className="relative w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500" aria-label={`Alerts (${alertCount})`}>
        🔔
        {alertCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-semibold">{alertCount}</span>}
      </button>
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-medium" aria-label="User Menu">AD</div>
    </header>
  );
};

export default AdminTopBar;
