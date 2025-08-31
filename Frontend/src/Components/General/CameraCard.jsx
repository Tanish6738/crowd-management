import React from 'react';

const statusRing = (s) => ({
  Online: 'ring-green-500',
  Degraded: 'ring-orange-400',
  Offline: 'ring-red-600'
}[s] || 'ring-[rgba(255,255,255,0.25)]');

const CameraCard = ({ camera, onClick }) => (
  <button
    onClick={() => onClick?.(camera)}
    className="relative w-40 flex-shrink-0 rounded-xl mk-panel overflow-hidden text-left focus:outline-none focus-visible:shadow-[var(--mk-focus-ring)] transition-shadow group"
    aria-label={`Camera ${camera.name} status ${camera.status}`}
  >
    <div className={`aspect-video w-full bg-[var(--mk-surface-2)] ring-4 ${statusRing(camera.status)} ring-offset-0 flex items-center justify-center mk-text-muted text-[11px] font-medium tracking-wide`}>{camera.thumbnail || 'Frame'}</div>
    <div className="p-2.5 space-y-1">
      <div className="text-[11px] font-semibold mk-text-primary truncate tracking-wide group-hover:mk-text-secondary transition-colors">{camera.name}</div>
      <div className="text-[10px] mk-text-muted flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--mk-accent)] opacity-70" /> {camera.facesPerMin} faces/min
      </div>
    </div>
    <span className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[rgba(0,0,0,0.45)] backdrop-blur-sm mk-text-secondary border border-[rgba(255,255,255,0.12)] tracking-wide">{camera.status}</span>
    <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-[rgba(255,143,42,0.18)]/20 via-transparent to-transparent" />
  </button>
);

export default CameraCard;
