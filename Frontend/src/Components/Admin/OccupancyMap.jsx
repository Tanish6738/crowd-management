import React from 'react';

// Placeholder responsive occupancy map. Future: integrate MapLibre/Leaflet.
const statusColor = (s) => ({
  Normal: 'bg-emerald-500/70',
  Busy: 'bg-amber-400/80',
  Critical: 'bg-red-500/80',
  Closed: 'bg-gray-600/70'
}[s] || 'bg-gray-500/60');

const OccupancyMap = ({ zones, onSelectZone, selectedZoneId }) => {
  return (
    <div className="relative w-full h-[55vh] sm:h-[60vh] lg:h-[calc(100vh-10rem)] rounded-lg border border-white/10 overflow-hidden bg-gradient-to-br from-[#0d1117] via-[#111b27] to-[#162433]">
      <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 p-1">
        {zones.map(z => (
          <button
            key={z.id}
            onClick={() => onSelectZone(z)}
            className={`relative group flex items-center justify-center text-[10px] sm:text-xs font-medium rounded ${statusColor(z.status)} text-white/90 transition focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:z-10 ${selectedZoneId === z.id ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-500/30' : 'ring-1 ring-white/10'} hover:brightness-110`}
            aria-label={`${z.name} occupancy ${z.occupancy}% status ${z.status}`}
          >
            {z.name}
            <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/40 backdrop-blur px-1 rounded-md text-white/80 border border-white/10">{z.occupancy}%</span>
          </button>
        ))}
      </div>
      {/* Legend */}
      <div className="absolute top-2 left-2 bg-white/5 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex flex-wrap gap-2 text-[10px] sm:text-xs text-white/70 shadow">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"/>Normal</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400"/>Busy</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"/>Critical</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600"/>Closed</span>
      </div>
    </div>
  );
};

export default OccupancyMap;
