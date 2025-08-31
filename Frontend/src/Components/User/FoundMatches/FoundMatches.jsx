import React, { useState } from "react";
import Drawer from "../../General/Drawer";
import { Clock, MapPin, CheckCircle2, XCircle } from "lucide-react";

const FoundMatches = ({ matches, loading, onConfirm, onReject }) => {
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
  return (
    <div className="space-y-4 text-white/90" aria-label="Found matches">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
        ))}
        {!loading && matches.length === 0 && (
          <div className="col-span-full p-10 text-center text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg">
            No matches yet.
          </div>
        )}
        {!loading && matches.map((m) => (
          <div
            key={m.id}
            role="button"
            tabIndex={0}
            aria-label={`Open match ${m.id}`}
            onClick={() => setDetail(m)}
            onKeyDown={(e) => { if (e.key === 'Enter') setDetail(m); }}
            className={`border rounded-lg p-3 flex flex-col gap-2 cursor-pointer backdrop-blur-sm transition ${detail?.id===m.id? 'border-orange-400/60 bg-white/10':'border-white/10 bg-white/5 hover:bg-white/10'}`}
          >
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-white/50">{m.id}</span>
              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${m.status === 'pending' ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : m.status === 'confirmed' ? 'bg-green-500/15 text-green-300 border-green-400/30' : 'bg-red-500/15 text-red-300 border-red-400/30'}`}>{m.status}</span>
            </div>
            <div className="text-[11px] text-white/75 line-clamp-2">{m.lost.description}</div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500" style={{ width: (m.confidence * 100).toFixed(0) + '%' }} />
            </div>
            <div className="text-[10px] text-white/55">Confidence {(m.confidence * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail ? 'Match ' + detail.id : ''}>
        {detail && (
          <div className="space-y-5 text-sm text-white/80">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Lost Report</h4>
              <div className="text-[11px] text-white/75 whitespace-pre-wrap">{detail.lost.description}</div>
              <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
                <span className="inline-flex items-center gap-1"><Clock size={12} className="text-white/40" />{rel(detail.lost.createdAt)}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-white/40" />{detail.lost.location}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Found Case</h4>
              <div className="text-[11px] text-white/75 whitespace-pre-wrap">{detail.found.description}</div>
              <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
                <span className="inline-flex items-center gap-1"><Clock size={12} className="text-white/40" />{rel(detail.found.createdAt)}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-white/40" />{detail.found.location}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500" style={{ width: (detail.confidence * 100).toFixed(0) + '%' }} />
              </div>
              <div className="text-[10px] text-white/55">Confidence {(detail.confidence * 100).toFixed(0)}%</div>
            </div>
            {detail.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => { onConfirm?.(detail.id); setDetail(null); }} className="flex-1 h-9 rounded-md bg-green-600/80 hover:bg-green-600 text-white text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60"><CheckCircle2 size={14} /> Confirm</button>
                <button onClick={() => { onReject?.(detail.id); setDetail(null); }} className="flex-1 h-9 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><XCircle size={14} /> Reject</button>
              </div>
            )}
            {detail.status === 'confirmed' && <div className="text-[11px] font-medium text-green-300">This match was confirmed.</div>}
            {detail.status === 'rejected' && <div className="text-[11px] font-medium text-red-300">You rejected this match.</div>}
          </div>
        )}
      </Drawer>
    </div>
  );
};
export default FoundMatches;
