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
    <div className="space-y-4 mk-text-secondary" aria-label="Found matches">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg mk-subtle animate-pulse" />
        ))}
        {!loading && matches.length === 0 && (
          <div className="col-span-full p-10 text-center text-xs mk-text-faint mk-subtle rounded-lg">
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
            className={`rounded-lg p-3 flex flex-col gap-2 cursor-pointer backdrop-blur-sm transition mk-focusable border ${detail?.id===m.id? 'border-orange-400/60 mk-surface-alt':'mk-subtle hover:mk-surface-alt'}`}
          >
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] mk-text-fainter">{m.id}</span>
              <span className={`mk-badge ${m.status === 'pending' ? 'mk-status-warn' : m.status === 'confirmed' ? 'mk-status-success' : 'mk-status-danger'}`}>{m.status}</span>
            </div>
            <div className="text-[11px] mk-text-faint line-clamp-2">{m.lost.description}</div>
            <div className="h-1.5 rounded-full mk-subtle overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500" style={{ width: (m.confidence * 100).toFixed(0) + '%' }} />
            </div>
            <div className="text-[10px] mk-text-fainter">Confidence {(m.confidence * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail ? 'Match ' + detail.id : ''}>
        {detail && (
          <div className="space-y-5 text-sm mk-text-secondary">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold mk-text-faint uppercase tracking-wide">Lost Report</h4>
              <div className="text-[11px] mk-text-faint whitespace-pre-wrap">{detail.lost.description}</div>
              <div className="flex flex-wrap gap-2 text-[10px] mk-text-fainter">
                <span className="inline-flex items-center gap-1"><Clock size={12} className="mk-text-fainter" />{rel(detail.lost.createdAt)}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} className="mk-text-fainter" />{detail.lost.location}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold mk-text-faint uppercase tracking-wide">Found Case</h4>
              <div className="text-[11px] mk-text-faint whitespace-pre-wrap">{detail.found.description}</div>
              <div className="flex flex-wrap gap-2 text-[10px] mk-text-fainter">
                <span className="inline-flex items-center gap-1"><Clock size={12} className="mk-text-fainter" />{rel(detail.found.createdAt)}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} className="mk-text-fainter" />{detail.found.location}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-1.5 rounded-full mk-subtle overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500" style={{ width: (detail.confidence * 100).toFixed(0) + '%' }} />
              </div>
              <div className="text-[10px] mk-text-fainter">Confidence {(detail.confidence * 100).toFixed(0)}%</div>
            </div>
            {detail.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => { onConfirm?.(detail.id); setDetail(null); }} className="flex-1 h-9 rounded-md mk-status-success hover:brightness-110 text-xs font-medium flex items-center justify-center gap-2 mk-focusable"><CheckCircle2 size={14} /> Confirm</button>
                <button onClick={() => { onReject?.(detail.id); setDetail(null); }} className="flex-1 h-9 rounded-md mk-status-danger hover:brightness-110 text-xs font-medium flex items-center justify-center gap-2 mk-focusable"><XCircle size={14} /> Reject</button>
              </div>
            )}
            {detail.status === 'confirmed' && <div className="text-[11px] font-medium mk-status-success px-2 py-1 rounded-md inline-block">Confirmed.</div>}
            {detail.status === 'rejected' && <div className="text-[11px] font-medium mk-status-danger px-2 py-1 rounded-md inline-block">Rejected.</div>}
          </div>
        )}
      </Drawer>
    </div>
  );
};
export default FoundMatches;
