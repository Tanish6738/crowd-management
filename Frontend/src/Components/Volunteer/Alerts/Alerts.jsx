import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Drawer from '../../General/Drawer';
import { AlertTriangle, ShieldAlert, Flame, Bell, Clock, MapPin, Filter, FileText, CheckCircle2 } from 'lucide-react';

/** @typedef {{ id:string; type:string; severity:'low'|'medium'|'high'|'critical'; zone:string; description:string; ts:string; status:'new'|'ack'|'resolved'; linkedTaskId?:string }} VolunteerAlert */

const sevMeta = {
  low: { color:'bg-green-500/15 text-green-300 border-green-400/30', icon: CheckCircle2 },
  medium: { color:'bg-amber-500/15 text-amber-300 border-amber-400/30', icon: AlertTriangle },
  high: { color:'bg-red-500/15 text-red-300 border-red-400/30', icon: Flame },
  critical: { color:'bg-purple-500/15 text-purple-300 border-purple-400/30', icon: ShieldAlert },
};

const statusColor = {
  new: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  ack: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  resolved: 'bg-green-500/15 text-green-300 border-green-400/30'
};

const relative = iso => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m ago'; const h=Math.floor(m/60); if(h<24) return h+'h ago'; const da=Math.floor(h/24); return da+'d ago'; };

const Alerts = ({ volunteerId='vol123' }) => {
  const [alerts, setAlerts] = useState(/** @type {VolunteerAlert[]} */([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState(/** @type {VolunteerAlert|null} */(null));
  const [report, setReport] = useState('');
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      await new Promise(r=>setTimeout(r, 500));
      const seed = [
        { id:'a1', type:'Crowd Density', severity:'medium', zone:'Zone 5', description:'High density detected near food stalls.', ts:new Date(Date.now()-18*60000).toISOString(), status:'new' },
        { id:'a2', type:'Lost Person', severity:'high', zone:'Zone 7', description:'Report of separated child near info booth.', ts:new Date(Date.now()-42*60000).toISOString(), status:'ack', linkedTaskId:'t2' },
      ];
      setAlerts(seed);
      setLoading(false);
    } catch(e){ setError('Failed to load alerts'); setLoading(false);}  
  }, []);

  useEffect(()=>{ load(); }, [load]);

  // WebSocket simulation for new alerts
  useEffect(()=>{ if(loading) return; const iv=setInterval(()=>{ setAlerts(a => [{ id:'a'+Date.now(), type:'Medical Assist', severity: ['low','medium','high'][Math.floor(Math.random()*3)] , zone:'Zone '+(Math.floor(Math.random()*9)+1), description:'Volunteer presence requested.', ts:new Date().toISOString(), status:'new' }, ...a]); }, 60000); return ()=>clearInterval(iv); }, [loading]);

  const filtered = useMemo(()=> alerts.filter(a => {
    if(severityFilter!=='all' && a.severity!==severityFilter) return false;
    if(statusFilter!=='all' && a.status!==statusFilter) return false;
    return true;
  }), [alerts, severityFilter, statusFilter]);

  const ackAlert = async (alert) => {
    setAlerts(al => al.map(a => a.id===alert.id? { ...a, status:'ack'}: a));
    setDetail(d => d && d.id===alert.id? { ...d, status:'ack'}: d);
    // await fetch(`/api/v1/alerts/${alert.id}/ack`, { method:'POST' });
  };
  const resolveAlert = async (alert) => {
    setResolving(true);
    try {
      await new Promise(r=>setTimeout(r, 700));
      setAlerts(al => al.map(a => a.id===alert.id? { ...a, status:'resolved'}: a));
      setDetail(d => d && d.id===alert.id? { ...d, status:'resolved'}: d);
      setReport('');
      // await fetch(`/api/v1/alerts/${alert.id}/resolve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ notes: report })});
    } finally { setResolving(false); }
  };

  const severityBadge = (sev) => { const { color, icon:Icon } = sevMeta[sev]; return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`.trim()}><Icon size={12}/>{sev}</span>; };
  const statusBadge = (st) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor[st]}`}>{st}</span>;

  const skeleton = Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"/>));

  return (
  <div className="space-y-4 text-white/90" aria-label="Volunteer alerts">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-white/70 font-medium"><Filter size={14} className="text-orange-400"/>Filters:</div>
        <select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">
          <option value="all">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="ack">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <div className="ml-auto text-[11px] text-white/50 flex items-center gap-1"><Bell size={12} className="text-orange-400"/> Live</div>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-5 md:gap-4">
        {/* List */}
  <div className="md:col-span-2 space-y-3 mb-4 md:mb-0">
          {loading && <div className="grid gap-3">{skeleton}</div>}
          {!loading && error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/40 text-sm flex justify-between items-center text-red-300">
              <span>{error}</span>
              <button onClick={load} className="underline hover:text-red-200">Retry</button>
            </div>
          )}
          {!loading && !error && filtered.length===0 && (
            <div className="p-10 text-center text-sm text-white/50 bg-white/5 border border-white/10 rounded-lg">No alerts match filters.</div>
          )}
          {!loading && !error && filtered.map(a => {
            const active = detail && detail.id===a.id;
            return (
              <div key={a.id} onClick={()=>setDetail(a)} className={`w-full cursor-pointer select-none text-left rounded-lg border p-4 flex flex-col gap-2 active:scale-[0.99] transition backdrop-blur-sm ${active? 'border-orange-400/60 ring-1 ring-orange-400/30 bg-white/10':'border-white/10 bg-white/5 hover:bg-white/10'} `} aria-label={a.type} role="button" tabIndex={0} onKeyDown={e=>{ if(e.key==='Enter') setDetail(a);}}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-white flex-1 leading-snug line-clamp-2">{a.type}</h3>
                  {severityBadge(a.severity)}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{a.zone}</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(a.ts)}</span>
                  {statusBadge(a.status)}
                </div>
                {a.status==='new' && <div className="flex">
                  <button onClick={(e)=>{ e.stopPropagation(); ackAlert(a); }} className="mt-1 h-8 px-3 rounded-md bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Acknowledge</button>
                </div>}
              </div>
            );
          })}
        </div>

        {/* Detail Panel (desktop visible) */}
        <div className="hidden md:block md:col-span-3">
          {detail ? (
            <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm h-full p-5 flex flex-col" aria-label="Alert detail panel">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-white leading-snug">{detail.type}</h2>
                  <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
                    {severityBadge(detail.severity)}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{detail.zone}</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(detail.ts)}</span>
                    {statusBadge(detail.status)}
                  </div>
                </div>
                <button onClick={()=>setDetail(null)} className="text-white/40 hover:text-white/70 text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">✕</button>
              </div>
              <div className="text-xs leading-relaxed text-white/75 mb-4 whitespace-pre-wrap flex-1">{detail.description}</div>
              {detail.linkedTaskId && <div className="text-[11px] mb-4"><span className="font-medium text-white/70">Linked Task:</span> <button className="text-orange-300 underline hover:text-orange-200">{detail.linkedTaskId}</button></div>}
              <div className="space-y-3">
                {detail.status==='new' && <button onClick={()=>ackAlert(detail)} className="h-10 rounded-md w-full bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Acknowledge</button>}
                {detail.status!=='resolved' && (
                  <>
                    <textarea value={report} onChange={e=>setReport(e.target.value)} placeholder="Add short report" rows={3} className="w-full text-xs rounded-md border border-white/10 bg-white/5 p-2 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:text-white/40 text-white" />
                    <button disabled={resolving} onClick={()=>resolveAlert(detail)} className="h-10 rounded-md w-full bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 disabled:opacity-60">{resolving? 'Resolving...':'Mark Resolved'}</button>
                  </>
                )}
                {detail.status==='resolved' && <div className="text-[11px] text-green-300 font-medium">Alert resolved.</div>}
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-white/15 rounded-lg flex items-center justify-center text-xs text-white/50">Select an alert to view details</div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={!!detail && window.innerWidth < 768} onClose={()=>setDetail(null)} title={detail? detail.type:''}>
        {detail && (
          <div className="space-y-4 text-sm text-white/80">
            <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
              {severityBadge(detail.severity)}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{detail.zone}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(detail.ts)}</span>
              {statusBadge(detail.status)}
            </div>
            <div className="text-xs leading-relaxed text-white/75 whitespace-pre-wrap">{detail.description}</div>
            {detail.linkedTaskId && <div className="text-[11px]"><span className="font-medium text-white/70">Linked Task:</span> <button className="text-orange-300 underline hover:text-orange-200">{detail.linkedTaskId}</button></div>}
            <div className="space-y-3">
              {detail.status==='new' && <button onClick={()=>ackAlert(detail)} className="h-10 rounded-md w-full bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium">Acknowledge</button>}
              {detail.status!=='resolved' && (
                <>
                  <textarea value={report} onChange={e=>setReport(e.target.value)} placeholder="Add short report" rows={3} className="w-full text-xs rounded-md border border-white/10 bg-white/5 p-2 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:text-white/40 text-white" />
                  <button disabled={resolving} onClick={()=>resolveAlert(detail)} className="h-10 rounded-md w-full bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium disabled:opacity-60">{resolving? 'Resolving...':'Mark Resolved'}</button>
                </>
              )}
              {detail.status==='resolved' && <div className="text-[11px] text-green-300 font-medium">Alert resolved.</div>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Alerts;
