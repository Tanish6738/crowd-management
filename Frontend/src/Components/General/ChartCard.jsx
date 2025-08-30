import React from 'react';

// Generic chart/card container with consistent padding, title bar, and responsive height.
const ChartCard = ({ title, description, children, className = '' }) => {
  return (
    <section className={`bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col ${className}`}>
      <header className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-gray-800 tracking-wide uppercase">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">{description}</p>}
        </div>
      </header>
      <div className="flex-1 min-h-[160px] px-2 sm:px-4 pb-3">{children}</div>
    </section>
  );
};

export default ChartCard;
