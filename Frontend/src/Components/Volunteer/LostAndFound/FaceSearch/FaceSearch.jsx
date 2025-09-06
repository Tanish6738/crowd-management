import React, { useState } from 'react';
import { searchFace } from '../../../../Services/api';
import { Search as SearchIcon, AlertCircle, Loader2 } from 'lucide-react';

/*
  FaceSearch (Volunteer UI)
  --------------------------------------------------
  Allows a volunteer to query the backend /search_face/{face_id} endpoint.
  MVP implementation: user enters face ID, we call API, display raw JSON payload.
  Could be enhanced later to show richer cards and link to existing local cases.
*/

const FaceSearch = () => {
  const [faceId, setFaceId] = useState('');
  const [result, setResult] = useState(null); // raw API response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <div className="space-y-2" aria-label="Search result">
          <div className="text-[11px] font-semibold mk-text-secondary uppercase tracking-wide">Result</div>
          <pre className="max-h-80 overflow-auto text-[10px] p-3 rounded-md mk-border mk-surface-alt whitespace-pre-wrap leading-relaxed">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      {!error && !result && !loading && (
        <div className="text-[11px] mk-text-muted">Enter a face ID to look for an existing lost/found record or match.</div>
      )}
    </div>
  );
};

export default FaceSearch;