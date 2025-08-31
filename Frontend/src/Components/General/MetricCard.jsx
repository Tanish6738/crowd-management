import React from 'react';

const MetricCard = ({ title, value, delta, loading, icon }) => {
  const renderIcon = () => {
    if (!icon) return null;
    // If already a valid element, render as-is
    if (React.isValidElement(icon)) return icon;
    // If it's a component (function/class), instantiate with default size
    try {
      const IconComp = icon; // assume component type
      return <IconComp size={16} strokeWidth={1.75} />;
    } catch {
      return null;
    }
  };

  return (
    <div className="group relative min-w-[150px] sm:min-w-[160px] flex-1 mk-panel p-3 sm:p-4 flex flex-col gap-1.5 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[1.5px] mk-text-muted">{title}</div>
        {icon && (
          <span className="text-[var(--mk-accent-strong)] text-lg leading-none flex items-center justify-center drop-shadow-[0_0_6px_rgba(255,143,42,0.4)]">
            {renderIcon()}
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-6 w-20 rounded bg-[rgba(255,255,255,0.08)] animate-pulse" />
      ) : (
        <div className="text-xl sm:text-2xl font-semibold mk-text-primary tabular-nums tracking-wide">{value}</div>
      )}
      {delta != null && !loading && (
        <div className={`text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 tracking-wide ${delta >= 0 ? 'text-[var(--mk-success)]' : 'text-[var(--mk-danger)]'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--mk-accent)]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default MetricCard;
