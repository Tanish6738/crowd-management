import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(null);

export const ToastProvider = ({ children, max=5, duration=4000 }) => {
  const [toasts, setToasts] = useState([]); // {id,type,message}
  const push = useCallback((message, opts={}) => {
    const id = Date.now()+Math.random();
    const t = { id, type: opts.type || 'info', message };
    setToasts(ts => [t, ...ts].slice(0, max));
    setTimeout(()=>{ setToasts(ts => ts.filter(x=>x.id!==id)); }, opts.duration || duration);
  }, [max, duration]);
  const remove = useCallback(id => setToasts(ts => ts.filter(t=>t.id!==id)), []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed z-50 top-4 right-4 w-72 space-y-2" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map(t => {
          const borderClass = t.type === 'success'
            ? 'border-green-400/40'
            : (t.type === 'error' ? 'border-red-400/40' : 'border-white/20');
          return (
            <div
              key={t.id}
              role="status"
              className={`p-3 rounded-md border text-xs shadow backdrop-blur bg-black/60 text-white flex items-start gap-2 animate-[fadeIn_.2s_ease] ${borderClass}`}
            >
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
                className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if(!ctx) throw new Error('useToast must be used inside <ToastProvider />');
  return ctx;
};

export default ToastProvider;