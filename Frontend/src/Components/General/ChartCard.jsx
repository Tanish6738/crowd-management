import React from 'react';

// Generic chart/card container with consistent padding, title bar, and responsive height.
const ChartCard = ({ title, description, children, className = '' }) => {
  return (
    <section className={`mk-panel flex flex-col ${className}`}>
      <header className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-semibold mk-text-secondary tracking-[1.5px] uppercase">{title}</h3>
          {description && <p className="mt-1 text-[10px] mk-text-muted leading-snug max-w-prose">{description}</p>}
        </div>
      </header>
      <div className="flex-1 min-h-[160px] px-3 sm:px-5 pb-4">{children}</div>
    </section>
  );
};

export default ChartCard;
