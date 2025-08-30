import React, { useEffect } from 'react';

const Modal = ({ open, onClose, title, children, actions }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col max-h-[90vh] focus:outline-none">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto text-sm">
          {children}
        </div>
        {actions && <div className="px-4 sm:px-5 py-3 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-gray-50 rounded-b-xl">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;
