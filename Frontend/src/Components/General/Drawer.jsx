import React, { useEffect } from "react";

const Drawer = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-[rgba(5,12,24,0.72)] backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[430px] max-w-full mk-panel flex flex-col border-l mk-divider animate-[mkSlideIn_.4s_cubic-bezier(.4,0,.2,1)]"
        aria-label="Side panel"
      >
        <div className="px-5 py-4 border-b mk-divider flex items-center justify-between gap-4">
          <h2 className="text-[13px] font-semibold mk-text-primary tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="mk-btn-tab h-8 px-3 py-1 rounded-full"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-[13px] leading-relaxed mk-text-secondary">
          {children}
        </div>
      </aside>
    </div>
  );
};

export default Drawer;
