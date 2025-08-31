import React, { useMemo, useState } from "react";
import Drawer from "../../General/Drawer";
import { Clock, MapPin, XCircle } from "lucide-react";

const MyReports = ({
  reports,
  loading,
  filterStatus,
  onFilterStatus,
  onCancel,
}) => {
  const [detail, setDetail] = useState(null);
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
  const filtered = useMemo(() => {
    let list = reports;
    if (filterStatus) list = list.filter((r) => r.status === filterStatus);
    return [...list].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [reports, filterStatus]);
  return (
    <div className="space-y-4" aria-label="My reports">
      <div className="flex flex-wrap gap-2 items-center text-[11px]">
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatus(e.target.value)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="matched">Matched</option>
          <option value="resolved">Resolved</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {filterStatus && (
          <button
            onClick={() => onFilterStatus("")}
            className="h-8 px-2 rounded-md bg-gray-100 text-gray-600"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"
            />
          ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full p-10 text-center text-xs text-gray-500 bg-white border rounded-lg">
            No reports yet.
          </div>
        )}
        {!loading &&
          filtered.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              aria-label={`Open report ${r.id}`}
              onClick={() => setDetail(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setDetail(r);
              }}
              className="bg-white border border-gray-200 hover:border-orange-400 rounded-lg p-3 flex flex-col gap-2 cursor-pointer shadow-sm"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] text-gray-500">
                  {r.id}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${r.status === "open" ? "bg-blue-100 text-blue-700 border-blue-200" : r.status === "matched" ? "bg-amber-100 text-amber-700 border-amber-200" : r.status === "resolved" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-200 text-gray-600 border-gray-300"}`}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-xs font-medium capitalize">{r.type}</div>
              <div className="text-[11px] text-gray-600 line-clamp-2">
                {r.description}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-auto">
                <Clock size={12} className="text-gray-400" />
                {rel(r.createdAt)}
              </div>
            </div>
          ))}
      </div>
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? "Report " + detail.id : ""}
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${detail.status === "open" ? "bg-blue-100 text-blue-700 border-blue-200" : detail.status === "matched" ? "bg-amber-100 text-amber-700 border-amber-200" : detail.status === "resolved" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-200 text-gray-600 border-gray-300"}`}
              >
                {detail.status}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                {rel(detail.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {detail.location}
              </span>
            </div>
            <div className="text-xs text-gray-700 whitespace-pre-wrap">
              {detail.description}
            </div>
            {detail.photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.photoUrls.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`Report photo ${i + 1}`}
                    className="h-20 w-full object-cover rounded"
                  />
                ))}
              </div>
            )}
            {detail.status === "open" && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    onCancel?.(detail.id);
                    setDetail(null);
                  }}
                  className="h-9 w-full rounded-md bg-red-600 text-white text-xs font-medium flex items-center justify-center gap-2"
                >
                  <XCircle size={14} /> Cancel Report
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
export default MyReports;
