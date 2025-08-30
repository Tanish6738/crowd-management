import React from 'react';

// LayoutShell: grid-based adaptive container; reserves space for desktop sidebar
const LayoutShell = ({ topBar, sidebar, children }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700 flex flex-col">
      {topBar}
      <div className="flex flex-1 w-full">
        {sidebar}
        <main className="flex-1 px-3 sm:px-4 lg:px-6 pb-28 sm:pb-24 pt-4 md:pt-6 overflow-x-hidden max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutShell;
