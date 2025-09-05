import React from 'react';

// LayoutShell: grid-based adaptive container; reserves space for desktop sidebar
// Adds mk-gradient-bg for subtle themed backdrop unless parent supplies one.
const LayoutShell = ({ topBar, sidebar, children, noBg = false, mainLabel = 'Main content' }) => {
  return (
    <div className={`flex flex-col flex-1 text-[15px] leading-snug font-medium mk-text-secondary ${noBg ? '' : 'mk-gradient-bg'}`}>
      {topBar}
      <div className="flex flex-1 w-full">
        {sidebar}
        <main
          className="flex-1 px-3 sm:px-5 lg:px-8 pb-32 sm:pb-28 pt-5 md:pt-8 overflow-x-hidden max-w-[1700px] w-full mx-auto"
          role="main"
          aria-label={mainLabel}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutShell;
