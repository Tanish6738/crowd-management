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
    <div className="group relative min-w-[150px] sm:min-w-[160px] flex-1 bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm flex flex-col gap-1.5 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</div>
        {icon && (
          <span className="text-orange-500 text-lg leading-none flex items-center justify-center">
            {renderIcon()}
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-6 w-20 bg-orange-100 animate-pulse rounded" />
      ) : (
        <div className="text-xl sm:text-2xl font-semibold text-gray-800 tabular-nums">{value}</div>
      )}
      {delta != null && !loading && (
        <div className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-orange-400/0 via-orange-400/60 to-orange-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default MetricCard;
