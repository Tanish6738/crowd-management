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
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] theme-light:bg-[rgba(0,0,0,0.35)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mk-panel rounded-2xl flex flex-col max-h-[90vh] focus:outline-none animate-[mkSlideIn_.45s_var(--mk-transition)]">
        <div className="px-5 py-4 border-b mk-divider flex items-center justify-between">
          <h2 className="text-[13px] font-semibold mk-text-primary tracking-wide">{title}</h2>
          <button className="mk-btn-tab h-8 px-3 py-1 rounded-full" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="p-5 overflow-y-auto text-[13px] leading-relaxed mk-text-secondary">
          {children}
        </div>
  {actions && <div className="px-5 py-4 border-t mk-divider flex flex-col-reverse sm:flex-row sm:justify-end gap-2 rounded-b-2xl mk-surface-alt/60">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;
