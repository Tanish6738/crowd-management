import React from 'react';

// Token-driven status dot with theme-friendly outer glow using current color.
const statusColor = (status) => {
  switch (status) {
    case 'Active':
      return 'bg-[var(--mk-success)] shadow-[0_0_0_3px_rgba(55,178,77,0.30)]';
    case 'Warning':
      return 'bg-[var(--mk-warning)] shadow-[0_0_0_3px_rgba(255,176,32,0.30)]';
    case 'Suspended':
      return 'bg-[var(--mk-danger)] shadow-[0_0_0_3px_rgba(255,92,108,0.35)]';
    case 'Critical':
      return 'bg-[var(--mk-danger)] shadow-[0_0_0_3px_rgba(255,92,108,0.45)] saturate-[1.2]';
    default:
      return 'bg-[var(--mk-muted)] shadow-[0_0_0_3px_rgba(0,0,0,0.15)] theme-dark:shadow-[0_0_0_3px_rgba(255,255,255,0.08)]';
  }
};

const StatusDot = ({ status, label }) => {
  const text = label || status;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs mk-text-secondary">
      <span
        className={`w-2.5 h-2.5 rounded-full ${statusColor(status)} ring-2 ring-[var(--mk-surface-2)] theme-light:ring-[var(--mk-surface)]`}
        aria-hidden="true"
      />
      <span className="hidden md:inline mk-text-faint tracking-wide">{text}</span>
      <span className="md:hidden uppercase font-semibold mk-text-fainter">{text.slice(0, 3)}</span>
    </span>
  );
};

export default StatusDot;
