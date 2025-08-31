import React from 'react';

// LayoutShell: grid-based adaptive container; reserves space for desktop sidebar
const LayoutShell = ({ topBar, sidebar, children }) => {
  return (
    <div className="flex flex-col flex-1 text-[15px] leading-snug font-medium mk-text-secondary">
      {topBar}
      <div className="flex flex-1 w-full">
        {sidebar}
        <main className="flex-1 px-3 sm:px-5 lg:px-8 pb-32 sm:pb-28 pt-5 md:pt-8 overflow-x-hidden max-w-[1700px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutShell;
