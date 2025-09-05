import React from 'react';

// TopBar: mobile-first; optional menu button; accessible landmarks
const TopBar = ({ onSearch, searchTerm, modelVersion, onMenu }) => {
  return (
  <header className="sticky top-0 z-30 backdrop-blur-xl border-b mk-divider flex items-center gap-3 px-3 sm:px-5 h-14 md:h-16 shadow-[0_4px_18px_-8px_rgba(0,0,0,.35)] mk-surface-alt/80" role="banner">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenu}
          className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-full mk-interactive text-[13px] font-semibold mk-text-secondary hover:mk-text-primary focus:outline-none focus-visible:shadow-[var(--mk-focus-ring)] mk-border"
          aria-label="Toggle navigation"
        >☰</button>
  <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[var(--mk-accent)] to-[var(--mk-accent-strong)] flex items-center justify-center text-[#09121f] font-bold text-sm shadow-[0_4px_14px_-4px_rgba(255,139,42,0.45)] ring-1 ring-[var(--mk-accent)]/50" aria-label="Dhruv AI Logo">DA</div>
        <span className="hidden xs:block truncate font-semibold mk-text-primary text-sm sm:text-[15px] tracking-wide">Dhruv AI Super Admin</span>
      </div>
      <div className="flex-1 min-w-[120px]" />
      <div className="relative w-40 sm:w-60 md:w-80">
        <input
          value={searchTerm}
          onChange={e => onSearch?.(e.target.value)}
          className="peer w-full h-10 rounded-xl mk-subtle focus:border-[var(--mk-accent)] focus:outline-none px-3 text-xs sm:text-[13px] mk-text-secondary placeholder:mk-text-muted/60 tracking-wide focus:bg-[var(--mk-surface-2)] transition-colors border"
          placeholder="Search..."
          aria-label="Search"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 mk-text-muted text-xs">⌕</span>
      </div>
      <button
        className="hidden sm:inline-flex text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-full bg-[rgba(255,143,42,0.12)] text-[var(--mk-accent-strong)] border border-[rgba(255,143,42,0.35)] hover:bg-[rgba(255,143,42,0.2)] font-semibold tracking-wide focus:outline-none focus-visible:shadow-[var(--mk-focus-ring)] shadow-[0_2px_10px_-4px_rgba(255,139,42,.5)]"
        aria-label="Model Version"
      >
        Model {modelVersion}
      </button>
  <div className="w-10 h-10 rounded-xl mk-subtle flex items-center justify-center text-[11px] sm:text-[12px] font-semibold mk-text-secondary ring-1 ring-[var(--mk-muted)]/40 select-none">SA</div>
    </header>
  );
};

export default TopBar;
