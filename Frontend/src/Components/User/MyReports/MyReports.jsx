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
    <div className="space-y-4 text-white/90" aria-label="My reports">
      <div className="flex flex-wrap gap-2 items-center text-[11px]">
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatus(e.target.value)}
          className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
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
            className="h-8 px-2 rounded-md bg-white/10 hover:bg-white/20 text-white/70"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full p-10 text-center text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg">No reports yet.</div>
        )}
        {!loading && filtered.map((r) => (
          <div
            key={r.id}
            role="button"
            tabIndex={0}
            aria-label={`Open report ${r.id}`}
            onClick={() => setDetail(r)}
            onKeyDown={(e) => { if (e.key === 'Enter') setDetail(r); }}
            className={`border rounded-lg p-3 flex flex-col gap-2 cursor-pointer backdrop-blur-sm transition ${detail?.id===r.id? 'border-orange-400/60 bg-white/10':'border-white/10 bg-white/5 hover:bg-white/10'}`}
          >
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-white/50">{r.id}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${r.status === 'open' ? 'bg-blue-500/15 text-blue-300 border-blue-400/30' : r.status === 'matched' ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : r.status === 'resolved' ? 'bg-green-500/15 text-green-300 border-green-400/30' : 'bg-white/10 text-white/55 border-white/15'}`}>{r.status}</span>
            </div>
            <div className="text-xs font-medium capitalize text-white/80">{r.type}</div>
            <div className="text-[11px] text-white/65 line-clamp-2">{r.description}</div>
            <div className="flex items-center gap-2 text-[10px] text-white/55 mt-auto"><Clock size={12} className="text-white/40" />{rel(r.createdAt)}</div>
          </div>
        ))}
      </div>
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? "Report " + detail.id : ""}
      >
        {detail && (
          <div className="space-y-4 text-sm text-white/80">
            <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${detail.status === 'open' ? 'bg-blue-500/15 text-blue-300 border-blue-400/30' : detail.status === 'matched' ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : detail.status === 'resolved' ? 'bg-green-500/15 text-green-300 border-green-400/30' : 'bg-white/10 text-white/55 border-white/15'}`}>{detail.status}</span>
              <span className="inline-flex items-center gap-1"><Clock size={12} className="text-white/40" />{rel(detail.createdAt)}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-white/40" />{detail.location}</span>
            </div>
            <div className="text-xs text-white/75 whitespace-pre-wrap">{detail.description}</div>
            {detail.photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.photoUrls.map((p, i) => (<img key={i} src={p} alt={`Report photo ${i + 1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            {detail.status === 'open' && (
              <div className="pt-2">
                <button onClick={() => { onCancel?.(detail.id); setDetail(null); }} className="h-9 w-full rounded-md bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><XCircle size={14} /> Cancel Report</button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
export default MyReports;
