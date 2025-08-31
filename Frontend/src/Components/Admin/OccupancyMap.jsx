import React from 'react';

// Placeholder responsive occupancy map. Future: integrate MapLibre/Leaflet.
const statusColor = (s) => ({ Normal: 'bg-green-500/60', Busy: 'bg-yellow-400/70', Critical: 'bg-red-600/70', Closed: 'bg-gray-800/70' }[s] || 'bg-gray-300');

const OccupancyMap = ({ zones, onSelectZone, selectedZoneId }) => {
  return (
    <div className="relative w-full h-[55vh] sm:h-[60vh] lg:h-[calc(100vh-10rem)] rounded-lg border border-gray-200 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 p-1">
        {zones.map(z => (
          <button
            key={z.id}
            onClick={() => onSelectZone(z)}
            className={`relative group flex items-center justify-center text-[10px] sm:text-xs font-medium rounded ${statusColor(z.status)} text-white transition focus:outline-none focus:ring-2 focus:ring-white/70 focus:z-10 ${selectedZoneId === z.id ? 'ring-2 ring-orange-500' : ''}`}
            aria-label={`${z.name} occupancy ${z.occupancy}% status ${z.status}`}
          >
            {z.name}
            <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/30 px-1 rounded-md">{z.occupancy}%</span>
          </button>
        ))}
      </div>
      {/* Legend */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md border border-gray-300 flex flex-wrap gap-2 text-[10px] sm:text-xs text-gray-700">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"/>Normal</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400"/>Busy</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600"/>Critical</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-800"/>Closed</span>
      </div>
    </div>
  );
};

export default OccupancyMap;
