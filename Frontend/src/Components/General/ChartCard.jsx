import React, { useId } from 'react';

/*
  ChartCard
  --------------------------------------------------
  Theme-adaptive container for charts / metrics.
  - Uses mk-panel (glass) base which already adapts via tokens.
  - Adds an id for a11y so region is announced with its title.
  - Optional description announced via aria-describedby.
*/
const ChartCard = ({ title, description, children, className = '' }) => {
  const headingId = useId();
  const descId = description ? headingId + '-desc' : undefined;
  return (
    <section
      className={`mk-panel flex flex-col focus-within:shadow-[var(--mk-focus-ring)] transition-shadow ${className}`}
      aria-labelledby={headingId}
      aria-describedby={descId}
    >
      <header className="px-4 pt-3 pb-2 flex items-start justify-between gap-2 border-b mk-divider/60">
        <div className="space-y-1 min-w-0">
          <h3 id={headingId} className="text-[11px] font-semibold mk-text-secondary tracking-[1.5px] uppercase truncate">
            {title}
          </h3>
          {description && (
            <p id={descId} className="text-[10px] mk-text-muted leading-snug max-w-prose">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="flex-1 min-h-[160px] px-3 sm:px-5 pb-4" role="group" aria-label={title + ' content'}>
        {children}
      </div>
    </section>
  );
};

export default ChartCard;
