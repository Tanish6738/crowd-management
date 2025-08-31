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
    <div className="space-y-4" aria-label="Alerts">
      <div className="flex items-center gap-2">
        <button
          onClick={onMarkAll}
          disabled={!unread}
          className={`h-8 px-3 rounded-md text-[11px] font-medium ${unread ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
        >
          Mark All Read
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {alerts.length === 0 && (
          <div className="p-6 text-xs text-gray-500">No alerts.</div>
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
            className={`p-3 flex gap-3 items-start text-xs cursor-pointer hover:bg-gray-50 ${!al.read ? "bg-orange-50/60" : ""}`}
            aria-label={`Alert ${al.id}`}
          >
            <Bell
              size={14}
              className={al.read ? "text-gray-400" : "text-orange-500"}
            />
            <div className="flex-1 min-w-0">
              <div className="text-gray-700 leading-snug">{al.message}</div>
              <div className="text-[10px] text-gray-500 mt-1">{rel(al.ts)}</div>
            </div>
            {!al.read && (
              <span
                className="h-2 w-2 rounded-full bg-orange-500 mt-1"
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
