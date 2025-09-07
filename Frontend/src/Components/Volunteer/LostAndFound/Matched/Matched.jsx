import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { getAllMatches, getAllLost, getAllFound, searchFace, normalizePersonRecord } from '../../../../Services/api';

/** @typedef {{ id:string; lostCase:{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; createdAt:string }; foundCase:{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; reportedAt:string }; confidence?:number|null; status:'matched'|'confirmed'|'rejected' }} MatchedCase */

const relative = (iso) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const da = Math.floor(h / 24);
  return da + 'd';
};

const confidenceColor = (v) => {
  if (v == null) return 'bg-white/10 text-white/60';
  if (v >= 0.85) return 'bg-green-500/15 text-green-300 border-green-400/30';
  if (v >= 0.6) return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
  return 'bg-red-500/15 text-red-300 border-red-400/30';
};

const Matched = ({ loading: externalLoading, data: externalData }) => {
  const [matches, setMatches] = useState(/** @type {MatchedCase[]} */(externalData || []));
  const [loading, setLoading] = useState(!externalData?.length && !!externalLoading);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(/** @type {MatchedCase|null} */(null));
  const [actionBusy, setActionBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichedMap, setEnrichedMap] = useState({}); // face_id -> normalized

  /**
   * API Alignment Notes:
   * - getAllMatches returns records: match_id, lost_face_id, found_face_id, match_status (may include lost_person / found_person objects depending on backend version)
   * - lost / found lists endpoints provide additional context (name, age, where_lost/location_found, status)
   * - We enrich matches by cross-referencing lost & found datasets when nested objects are absent.
   */
  const fetchMatches = useCallback(async () => {
    if (externalData?.length) return; // parent-supplied data takes precedence
    setLoading(true); setError(null);
    try {
      const [matchesRes, lostRes, foundRes] = await Promise.all([
        getAllMatches(),
        getAllLost().catch(()=>({ records: [] })),
        getAllFound().catch(()=>({ records: [] }))
      ]);
      const lostMap = Object.fromEntries((lostRes.records||[]).map(r => [r.face_id, r]));
      const foundMap = Object.fromEntries((foundRes.records||[]).map(r => [r.face_id, r]));
      const transformed = (matchesRes.records || []).map(r => {
        const lostRaw = r.lost_person || lostMap[r.lost_face_id] || {};
        const foundRaw = r.found_person || foundMap[r.found_face_id] || {};
        return {
          id: r.match_id,
          lostCase: {
            id: r.lost_face_id,
            type: 'person',
            description: lostRaw.name ? `Lost: ${lostRaw.name} (${lostRaw.age ?? '—'} yrs)` : 'Lost person',
            photoUrls: [], // API list does not currently expose image URLs
            location: lostRaw.where_lost || 'Unknown',
            createdAt: r.match_time || lostRaw.upload_time || new Date().toISOString()
          },
          foundCase: {
            id: r.found_face_id,
            type: 'person',
            description: foundRaw.name ? `Found: ${foundRaw.name}` : 'Found person',
            photoUrls: [],
            location: foundRaw.location_found || 'Unknown',
            reportedAt: r.match_time || foundRaw.upload_time || new Date().toISOString()
          },
          confidence: null, // backend not returning similarity score here yet
          status: r.match_status || 'matched'
        };
      });
      setMatches(transformed);
    } catch (e) {
      setError(e.message || 'Failed to load matches');
    } finally { setLoading(false); }
  }, [externalData]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);
  useEffect(() => { if (externalData?.length) setMatches(externalData); }, [externalData]);

  const sorted = useMemo(() => [...matches].sort((a,b)=> new Date(b.foundCase.reportedAt)-new Date(a.foundCase.reportedAt)), [matches]);

  const updateStatus = (id, status) => {
    setMatches(m => m.map(x => x.id===id ? { ...x, status } : x));
    if (detail?.id === id) setDetail(d => d ? { ...d, status } : d);
  };
  // Local only (no backend mutation endpoints documented yet)
  const confirmMatch = async (mc) => { setActionBusy(true); try { await new Promise(r=>setTimeout(r,300)); updateStatus(mc.id,'confirmed'); } finally { setActionBusy(false); } };
  const rejectMatch = async (mc) => { setActionBusy(true); try { await new Promise(r=>setTimeout(r,300)); updateStatus(mc.id,'rejected'); } finally { setActionBusy(false); } };

  return (
    <div className="grid md:grid-cols-5 gap-5" aria-label="Matched cases">
      <div className="space-y-3 md:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold mk-text-primary uppercase tracking-wide">Matches</h3>
          <button onClick={fetchMatches} disabled={loading} className="h-7 px-2 rounded-md mk-border mk-surface-alt text-[10px] flex items-center gap-1 disabled:opacity-50 hover:bg-orange-50 dark:hover:bg-white/10"><RefreshCw size={12}/> Refresh</button>
        </div>
        {loading && Array.from({length:4}).map((_,i)=>(<div key={i} className="h-20 rounded-lg bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"/>))}
        {error && <div className="p-3 text-[11px] rounded-md bg-red-500/10 border border-red-500/40 text-red-300 flex justify-between"><span>{error}</span><button onClick={fetchMatches} className="underline">Retry</button></div>}
        {!loading && !error && sorted.length===0 && <div className="p-8 text-center text-xs mk-text-muted mk-surface-alt mk-border rounded-lg">No matches.</div>}
        {sorted.map(m => (
          <div key={m.id} role="button" tabIndex={0} onClick={()=>{
            setDetail(m);
            const ids = [m.lostCase.id, m.foundCase.id];
            const need = ids.filter(id => id && !enrichedMap[id]);
            if(need.length){
              setEnriching(true);
              Promise.all(need.map(id => searchFace(id).then(res=>({id, norm: normalizePersonRecord(res)})).catch(()=>null)))
                .then(results => {
                  setEnrichedMap(map => {
                    const next = {...map};
                    results.filter(Boolean).forEach(r => { if(r.norm && !r.norm.not_found) next[r.id] = r.norm; });
                    return next;
                  });
                })
                .finally(()=> setEnriching(false));
            }
          }} onKeyDown={e=>{ if(e.key==='Enter') setDetail(m); }} className={`mk-border rounded-lg p-3 flex flex-col gap-2 cursor-pointer backdrop-blur-sm transition ${detail?.id===m.id? 'border-orange-400/60 bg-orange-50 dark:bg-white/10':'mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-mono mk-text-fainter truncate" title={m.id}>{m.id}</div>
              <span className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wide ${m.status==='matched'?'bg-amber-500/15 text-amber-300 border-amber-400/30': m.status==='confirmed'?'bg-green-500/15 text-green-300 border-green-400/30':'bg-red-500/15 text-red-300 border-red-400/30'}`}>{m.status}</span>
            </div>
              <div className="text-[11px] mk-text-primary line-clamp-2">{enrichedMap[m.lostCase.id]?.name ? `Lost: ${enrichedMap[m.lostCase.id].name}` : m.lostCase.description}</div>
            <div className="flex items-center justify-between text-[10px] mk-text-muted">
              <span className="inline-flex items-center gap-1"><Clock size={11} className="mk-text-fainter"/>{relative(m.foundCase.reportedAt)}</span>
              <span className={`px-2 py-0.5 rounded border ${confidenceColor(m.confidence)}`}>{m.confidence==null ? '—' : (m.confidence*100).toFixed(0)+'%'}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block md:col-span-3">
        {detail ? (
          <div className="rounded-lg mk-border mk-surface-alt backdrop-blur-sm h-full p-5 flex flex-col" aria-label="Match detail">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold mk-text-primary leading-snug">Match Detail</h2>
                <div className="flex flex-wrap gap-2 text-[11px] mk-text-muted">
                  <span className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wide ${detail.status==='matched'?'bg-amber-500/15 text-amber-300 border-amber-400/30': detail.status==='confirmed'?'bg-green-500/15 text-green-300 border-green-400/30':'bg-red-500/15 text-red-300 border-red-400/30'}`}>{detail.status}</span>
                  <span className={`px-2 py-0.5 rounded border ${confidenceColor(detail.confidence)}`}>Confidence {detail.confidence==null?'—':(detail.confidence*100).toFixed(1)+'%'}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(detail.foundCase.reportedAt)}</span>
                </div>
              </div>
              <button onClick={()=>setDetail(null)} className="mk-text-fainter hover:mk-text-primary text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
              <div className="p-3 rounded-md mk-border bg-white/5 flex flex-col gap-2">
                <h3 className="font-semibold mk-text-primary text-xs">Lost Case</h3>
                {enrichedMap[detail.lostCase.id]?.raw?.record?.face_blob && (
                  <div className="w-full aspect-[4/5] rounded-md overflow-hidden mk-border">
                    <img src={`data:image/jpeg;base64,${enrichedMap[detail.lostCase.id].raw.record.face_blob}`} alt="Lost face" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="text-white/70 leading-snug">{enrichedMap[detail.lostCase.id]?.name ? `Lost: ${enrichedMap[detail.lostCase.id].name}` : detail.lostCase.description}</div>
                <div className="text-white/40">ID: {detail.lostCase.id}</div>
              </div>
              <div className="p-3 rounded-md mk-border bg-white/5 flex flex-col gap-2">
                <h3 className="font-semibold mk-text-primary text-xs">Found Case</h3>
                {enrichedMap[detail.foundCase.id]?.raw?.record?.face_blob && (
                  <div className="w-full aspect-[4/5] rounded-md overflow-hidden mk-border">
                    <img src={`data:image/jpeg;base64,${enrichedMap[detail.foundCase.id].raw.record.face_blob}`} alt="Found face" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="text-white/70 leading-snug">{enrichedMap[detail.foundCase.id]?.name ? `Found: ${enrichedMap[detail.foundCase.id].name}` : detail.foundCase.description}</div>
                <div className="text-white/40">ID: {detail.foundCase.id}</div>
              </div>
            </div>
            {enriching && <div className="mt-3 text-[10px] text-white/60">Loading detailed face data…</div>}
            {detail.status==='matched' && (
              <div className="mt-5 flex gap-3">
                <button disabled={actionBusy} onClick={()=>confirmMatch(detail)} className="flex-1 h-10 rounded-md bg-green-600/80 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Confirm</button>
                <button disabled={actionBusy} onClick={()=>rejectMatch(detail)} className="flex-1 h-10 rounded-md bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 flex items-center justify-center gap-2"><XCircle size={16}/> Reject</button>
              </div>
            )}
            {detail.status!=='matched' && <div className="mt-4 text-[11px] text-white/60">Status updated locally (no backend mutation endpoint yet).</div>}
          </div>
        ) : (
          <div className="h-full border border-dashed mk-border rounded-lg flex items-center justify-center text-xs mk-text-muted">Select a match</div>
        )}
      </div>
    </div>
  );
};

export default Matched;
