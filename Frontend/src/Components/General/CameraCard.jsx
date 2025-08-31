import React from 'react';

const statusRing = (s) => ({ Online: 'ring-green-500', Degraded: 'ring-orange-400', Offline: 'ring-red-600' }[s] || 'ring-gray-400');

const CameraCard = ({ camera, onClick }) => (
  <button
    onClick={() => onClick?.(camera)}
    className="relative w-40 flex-shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-orange-500"
    aria-label={`Camera ${camera.name} status ${camera.status}`}
  >
    <div className={`aspect-video w-full bg-gray-200 ring-4 ${statusRing(camera.status)} ring-offset-0 flex items-center justify-center text-gray-500 text-xs font-medium`}>{camera.thumbnail || 'Frame'}</div>
    <div className="p-2 space-y-1">
      <div className="text-xs font-semibold text-gray-800 truncate">{camera.name}</div>
      <div className="text-[11px] text-gray-600 flex items-center gap-1">
        <span className="inline-block w-2 h-2 rounded-full bg-gray-400" /> {camera.facesPerMin} faces/min
      </div>
    </div>
    <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-white">{camera.status}</span>
  </button>
);

export default CameraCard;
