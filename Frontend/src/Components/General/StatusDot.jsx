import React from 'react';

const statusColor = (status) => {
  switch (status) {
    case 'Active': return 'bg-[var(--mk-success)] shadow-[0_0_0_3px_rgba(55,178,77,0.25)]';
    case 'Warning': return 'bg-[var(--mk-warning)] shadow-[0_0_0_3px_rgba(255,176,32,0.25)]';
    case 'Suspended': return 'bg-[var(--mk-danger)] shadow-[0_0_0_3px_rgba(255,92,108,0.3)]';
    case 'Critical': return 'bg-red-700 shadow-[0_0_0_3px_rgba(220,38,38,0.35)]';
    default: return 'bg-[var(--mk-muted)] shadow-[0_0_0_3px_rgba(255,255,255,0.08)]';
  }
};

const StatusDot = ({ status, label }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs mk-text-secondary">
    <span className={`w-2.5 h-2.5 rounded-full ${statusColor(status)} ring-2 ring-[var(--mk-surface-2)]`} aria-hidden="true" />
    <span className="hidden md:inline mk-text-muted/90 tracking-wide">{label || status}</span>
    <span className="md:hidden uppercase font-semibold mk-text-muted/80">{(label || status).slice(0,3)}</span>
  </span>
);

export default StatusDot;
