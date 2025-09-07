import React, { useState } from 'react';
import { searchFace, normalizePersonRecord } from '../../../../Services/api';
import { Search as SearchIcon, AlertCircle, Loader2, ImageIcon, X, FileJson, Info } from 'lucide-react';

/*
  FaceSearch (Volunteer UI)
  --------------------------------------------------
  Allows a volunteer to query the backend /search_face/{face_id} endpoint.
  MVP implementation: user enters face ID, we call API, display raw JSON payload.
  Could be enhanced later to show richer cards and link to existing local cases.
*/

const FaceSearch = () => {
  const [faceId, setFaceId] = useState('');
  const [result, setResult] = useState(null); // raw API response (object or not_found)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const disabled = !faceId.trim() || loading;

  const doSearch = async (e) => {
    e?.preventDefault();
    if (disabled) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await searchFace(faceId.trim());
      setResult(res);
    } catch (e) {
      setError(e.message || 'Search failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="mk-border mk-surface-alt rounded-md p-4 space-y-4" aria-label="Search by Face ID">
      <form onSubmit={doSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-2 top-1/2 -translate-y-1/2 mk-text-fainter" />
          <input
            value={faceId}
            onChange={e=>setFaceId(e.target.value)}
            placeholder="Enter face ID (UUID)"
            className="w-full h-10 pl-8 pr-3 rounded-md mk-border mk-surface-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 text-[13px]"
          />
        </div>
        <button
          type="submit"
          disabled={disabled}
          className={`h-10 px-5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${disabled? 'mk-surface-alt mk-text-muted cursor-not-allowed':'bg-gradient-to-r from-[var(--mk-accent)] to-[var(--mk-accent-strong)] text-[#081321] shadow hover:brightness-110'}`}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading? 'Searching' : 'Search'}
        </button>
      </form>
      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/40 text-[11px] flex items-center gap-2 mk-text-primary">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-red-300">{error}</span>
          <button onClick={doSearch} className="ml-auto underline text-red-200 hover:text-red-100">Retry</button>
        </div>
      )}
      {!error && result && (
        <ResultPanel result={result} showRaw={showRaw} onToggleRaw={()=>setShowRaw(s=>!s)} />
      )}
      {!error && !result && !loading && (
        <div className="text-[11px] mk-text-muted">Enter a face ID to look for an existing lost/found record or match.</div>
      )}
    </div>
  );
};

// ---------- Presentational subcomponents ----------

const ResultPanel = ({ result, showRaw, onToggleRaw }) => {
  // If searchFace returned structured not_found sentinel
  if (result?.not_found) {
    return (
      <div className="rounded-md mk-border p-4 flex items-start gap-3 bg-amber-500/5 border-amber-500/40">
        <Info size={16} className="text-amber-400 mt-0.5" />
        <div className="grow space-y-1">
          <div className="text-xs font-semibold tracking-wide text-amber-300">Face ID Not Found</div>
          <div className="text-[11px] text-amber-200/90">No record exists yet for face_id <span className="font-mono">{result.face_id}</span>. It may be newly uploaded or incorrect.</div>
        </div>
        <button onClick={onToggleRaw} className="text-[10px] px-2 py-1 mk-border rounded hover:bg-amber-500/10 transition" title="Toggle raw response JSON">
          {showRaw? 'Hide JSON':'Raw JSON'}
        </button>
        {showRaw && (
          <pre className="w-full col-span-full mt-3 max-h-60 overflow-auto text-[10px] p-3 rounded mk-border mk-surface-alt leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    );
  }

  const norm = normalizePersonRecord(result);
  const rec = result.record || {};
  const imgSrc = rec.face_blob ? `data:image/jpeg;base64,${rec.face_blob}` : null;
  const meta = [
    ['Name', rec.name],
    ['Gender', rec.gender],
    ['Age', rec.age],
    ['Relation', rec.relation_with_lost],
    ['Where Lost', rec.where_lost],
    ['Reporter', rec.reporter_name || '—'],
    ['Status', rec.status],
    ['Uploaded', rec.upload_time ? formatDate(rec.upload_time) : '—'],
    ['Mobile', rec.contact_details?.mobile_no],
    ['Email', rec.contact_details?.email_id]
  ].filter(([,v]) => v !== undefined && v !== null && v !== '');

  return (
    <div className="space-y-3" aria-label="Search result">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-[11px] font-semibold mk-text-secondary uppercase tracking-wide">Result</div>
        <span className="text-[10px] px-2 py-0.5 rounded mk-border mk-surface-alt/50">{result.collection}</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-accent/20 font-mono">{truncate(result.face_id)}</span>
        {norm && !norm.not_found && (
          <div className="flex gap-2 text-[10px] ml-2 flex-wrap">
            <InfoPill label="Case ID" value={truncate(norm.id,18)} />
            <InfoPill label="Type" value={norm.type} />
            <InfoPill label="Status" value={norm.status} />
            <InfoPill label="Created" value={norm.createdAt ? formatDate(norm.createdAt) : '-'} />
            <InfoPill label="Location" value={norm.location} />
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={onToggleRaw} className="text-[10px] px-2 py-1 mk-border rounded flex items-center gap-1 hover:bg-white/5 transition" title="Toggle raw JSON">
            <FileJson size={12} /> {showRaw? 'Hide JSON':'Raw JSON'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="relative w-full aspect-[4/5] rounded-md overflow-hidden mk-border bg-black/40 flex items-center justify-center">
            {imgSrc ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={imgSrc} alt="Face image" className="object-cover w-full h-full" />
            ) : (
              <div className="flex flex-col items-center text-[10px] text-white/50 gap-2">
                <ImageIcon size={18} />
                <span>No face image</span>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {meta.map(([k,v]) => (
              <div key={k} className="space-y-0.5">
                <div className="text-[9px] uppercase tracking-wide mk-text-muted">{k}</div>
                <div className="text-[12px] font-medium break-words">{String(v)}</div>
              </div>
            ))}
          </div>
          {rec.additional_info && (
            <div className="text-[11px] mk-text-secondary">
              <span className="font-semibold">Notes: </span>{rec.additional_info}
            </div>
          )}
        </div>
      </div>
      {showRaw && (
        <pre className="max-h-72 overflow-auto text-[10px] p-3 rounded-md mk-border mk-surface-alt whitespace-pre-wrap leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

// ---------- Utilities ----------
function truncate(id = '', n = 24) {
  return id.length > n ? id.slice(0, n-4) + '…' + id.slice(-4) : id;
}
function formatDate(str){
  try { return new Date(str).toLocaleString(); } catch { return str; }
}

const InfoPill = ({ label, value }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded mk-border mk-surface-alt/60">
    <span className="uppercase text-[8px] tracking-wide mk-text-muted">{label}</span>
    <span className="font-mono text-[10px]">{value}</span>
  </span>
);

export default FaceSearch;