import React from "react";
import { Bell } from "lucide-react";

const Alerts = ({ alerts, onMarkRead, onMarkAll, unread }) => {
  const rel = (iso) => {
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h";
    const da = Math.floor(h / 24);
    return da + "d";
  };
  return (
    <div className="space-y-4 mk-text-secondary" aria-label="Alerts">
      <div className="flex items-center gap-2">
        <button
          onClick={onMarkAll}
          disabled={!unread}
          className={`h-8 px-3 rounded-md text-[11px] font-medium transition mk-focusable ${unread ? 'bg-blue-600 text-white hover:bg-blue-500 shadow' : 'mk-subtle opacity-50 cursor-not-allowed'}`}
        >
          Mark All Read
        </button>
      </div>
      <div className="mk-card mk-surface-alt backdrop-blur divide-y divide-white/5 theme-light:divide-black/5">
        {alerts.length === 0 && (
          <div className="p-6 text-xs mk-text-faint">No alerts.</div>
        )}
        {alerts.map((al) => (
          <div
            key={al.id}
            role="button"
            tabIndex={0}
            onClick={() => onMarkRead(al.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onMarkRead(al.id);
            }}
            className={`p-3 flex gap-3 items-start text-xs cursor-pointer transition rounded-md first:rounded-t-lg last:rounded-b-lg mk-hover-row ${!al.read ? 'mk-subtle' : ''}`}
            aria-label={`Alert ${al.id}`}
          >
            <Bell
              size={14}
              className={al.read ? 'mk-text-fainter' : 'mk-accent'}
            />
            <div className="flex-1 min-w-0">
              <div
                className={`leading-snug ${al.read ? 'mk-text-faint' : 'mk-text-primary'}`}
              >
                {al.message}
              </div>
              <div className="text-[10px] mk-text-fainter mt-1">{rel(al.ts)}</div>
            </div>
            {!al.read && (
              <span
                className="h-2 w-2 rounded-full mk-bg-accent mt-1"
                aria-label="Unread"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default Alerts;
