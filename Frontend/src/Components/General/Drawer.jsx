import React, { useEffect } from 'react';

const Drawer = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] max-w-full bg-white shadow-xl border-l border-gray-200 flex flex-col transform translate-x-0" aria-label="Side panel">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded" aria-label="Close drawer">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {children}
        </div>
      </aside>
    </div>
  );
};

export default Drawer;
