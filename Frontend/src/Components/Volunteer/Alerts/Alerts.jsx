import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Drawer from '../../General/Drawer';
import { AlertTriangle, ShieldAlert, Flame, Bell, Clock, MapPin, Filter, CheckCircle2, RefreshCw } from 'lucide-react';
import { getUserAlerts } from '../../../Services/api';

/** @typedef {{ id:string; type:string; severity:'low'|'medium'|'high'|'critical'; zone:string; description:string; ts:string; status:'new'|'ack'|'resolved'; linkedTaskId?:string }} VolunteerAlert */

// Severity badge color styles (still hue‑specific, but independent from base surfaces)
const sevMeta = {
  low: { color:'bg-green-500/15 text-green-500 dark:text-green-300 border border-green-500/30', icon: CheckCircle2 },
  medium: { color:'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30', icon: AlertTriangle },
  high: { color:'bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30', icon: Flame },
  critical: { color:'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30', icon: ShieldAlert },
};

const statusColor = {
  new: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30',
  ack: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30',
  resolved: 'mk-status-success', // leverage token utility for resolved state
};

const relative = iso => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m ago'; const h=Math.floor(m/60); if(h<24) return h+'h ago'; const da=Math.floor(h/24); return da+'d ago'; };

const Alerts = ({ volunteerId='demo_user_123' }) => {
  const [alerts, setAlerts] = useState(/** @type {VolunteerAlert[]} */([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState(/** @type {VolunteerAlert|null} */(null));
  const [report, setReport] = useState('');
  const [resolving, setResolving] = useState(false);

  /**
   * Map backend alert entry (type + data) to internal VolunteerAlert.
   * Backend (GET /alert/{user_id}) returns alerts: [{ type:'lost'|'found', data:{ ...record }}]
   * We derive severity heuristically (lost -> high, found -> medium) until backend provides native severity.
   */
  const mapApiAlerts = (apiAlerts) => {
    return (apiAlerts||[]).map(a => {
      const rec = a.data || {}; // lost or found person record
      const baseType = a.type; // 'lost' | 'found'
      const statusRaw = rec.status; // 'pending' | 'found'
      const severity = baseType === 'lost' ? 'high' : 'medium';
      const zone = rec.where_lost || rec.location_found || '—';
      const personName = rec.name || 'Unnamed';
      const actionLabel = baseType === 'lost' ? 'Lost Person Status Update' : 'Found Person Status Update';
      const desc = baseType === 'lost'
        ? `${personName} (${rec.age ?? 'Unknown'} yrs) reported ${rec.where_lost ? 'at '+rec.where_lost : ''}. Status: ${statusRaw}.`
        : `${personName} (${rec.age ?? 'Unknown'} yrs) found${rec.location_found? ' at '+rec.location_found:''}. Status: ${statusRaw}.`;
      return {
        id: rec.face_id || 'alert_'+Math.random().toString(16).slice(2),
        type: actionLabel,
        severity,
        zone,
        description: desc.trim(),
        ts: rec.status_updated_time || rec.upload_time || new Date().toISOString(),
        status: 'new'
      };
    });
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getUserAlerts(volunteerId);
      const mapped = mapApiAlerts(res.alerts);
      setAlerts(mapped);
    } catch(e){
      setError(e.message || 'Failed to load alerts');
    } finally { setLoading(false); }
  }, [volunteerId]);

  useEffect(()=>{ load(); }, [load]);

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

  const severityBadge = (sev) => { const { color, icon:Icon } = sevMeta[sev]; return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${color}`.trim()}><Icon size={12}/>{sev}</span>; };
  const statusBadge = (st) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusColor[st]}`}>{st}</span>;

  const skeleton = Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 rounded-lg mk-surface-alt mk-border animate-pulse"/>));

  return (
  <div className="space-y-4 mk-text-secondary" aria-label="Volunteer alerts">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs mk-text-muted">
        <div className="flex items-center gap-1 mk-text-muted font-medium"><Filter size={14} className="text-[var(--mk-accent)]"/>Filters:</div>
        <select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} className="h-8 rounded-md mk-border mk-surface-alt px-2 mk-text-secondary focus:outline-none focus-visible:mk-focusable">
          <option value="all">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-8 rounded-md mk-border mk-surface-alt px-2 mk-text-secondary focus:outline-none focus-visible:mk-focusable">
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="ack">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} disabled={loading} className="h-8 px-3 rounded-md mk-border mk-surface-alt flex items-center gap-1 text-[11px] disabled:opacity-50 hover:bg-orange-50 dark:hover:bg-white/10"><RefreshCw size={12}/> {loading? 'Loading':'Refresh'}</button>
          <div className="text-[11px] mk-text-faint flex items-center gap-1"><Bell size={12} className="text-[var(--mk-accent)]"/> Live</div>
        </div>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-5 md:gap-4">
        {/* List */}
  <div className="md:col-span-2 space-y-3 mb-4 md:mb-0">
          {loading && <div className="grid gap-3">{skeleton}</div>}
          {loading && error && (
            <div className="p-4 rounded-lg mk-border mk-surface-alt text-sm flex justify-between items-center text-red-400">
              <span>{error}</span>
              <button onClick={load} className="underline hover:text-red-300">Retry</button>
            </div>
          )}
          {!loading && !error && filtered.length===0 && (
            <div className="p-10 text-center text-sm mk-text-faint mk-surface-alt mk-border rounded-lg">No alerts match filters.</div>
          )}
          {!loading && !error && filtered.map(a => {
            const active = detail && detail.id===a.id;
            return (
              <div key={a.id} onClick={()=>setDetail(a)} className={`w-full cursor-pointer select-none text-left rounded-lg mk-border p-4 flex flex-col gap-2 active:scale-[0.99] transition backdrop-blur-sm ${active? 'ring-1 ring-[var(--mk-accent)] mk-surface-alt border-[var(--mk-accent)]/60':'mk-surface-alt hover:bg-[var(--mk-surface-2)]'} `} aria-label={a.type} role="button" tabIndex={0} onKeyDown={e=>{ if(e.key==='Enter') setDetail(a);}}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm mk-text-primary flex-1 leading-snug line-clamp-2">{a.type}</h3>
                  {severityBadge(a.severity)}
                </div>
                <div className="flex items-center gap-2 text-[11px] mk-text-faint">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-300 font-medium"><MapPin size={12}/>{a.zone}</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="opacity-60"/>{relative(a.ts)}</span>
                  {statusBadge(a.status)}
                </div>
                {a.status==='new' && <div className="flex">
                  <button onClick={(e)=>{ e.stopPropagation(); ackAlert(a); }} className="mt-1 h-8 px-3 rounded-md bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">Acknowledge</button>
                </div>}
              </div>
            );
          })}
        </div>

        {/* Detail Panel (desktop visible) */}
        <div className="hidden md:block md:col-span-3">
          {detail ? (
            <div className="rounded-lg mk-border mk-surface-alt backdrop-blur-sm h-full p-5 flex flex-col" aria-label="Alert detail panel">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <h2 className="text-sm font-semibold mk-text-primary leading-snug">{detail.type}</h2>
                  <div className="flex flex-wrap gap-2 text-[11px] mk-text-faint">
                    {severityBadge(detail.severity)}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-300 font-medium"><MapPin size={12}/>{detail.zone}</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="opacity-60"/>{relative(detail.ts)}</span>
                    {statusBadge(detail.status)}
                  </div>
                </div>
                <button onClick={()=>setDetail(null)} className="mk-text-fainter hover:mk-text-secondary text-sm px-2 py-1 rounded focus:outline-none focus-visible:mk-focusable">✕</button>
              </div>
              <div className="text-xs leading-relaxed mk-text-secondary/90 mb-4 whitespace-pre-wrap flex-1">{detail.description}</div>
              {detail.linkedTaskId && <div className="text-[11px] mb-4"><span className="font-medium mk-text-muted">Linked Task:</span> <button className="text-[var(--mk-accent)] underline hover:brightness-110">{detail.linkedTaskId}</button></div>}
              <div className="space-y-3">
                {detail.status==='new' && <button onClick={()=>ackAlert(detail)} className="h-10 rounded-md w-full bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">Acknowledge</button>}
                {detail.status!=='resolved' && (
                  <>
                    <textarea value={report} onChange={e=>setReport(e.target.value)} placeholder="Add short report" rows={3} className="w-full text-xs rounded-md mk-border mk-surface-alt p-2 resize-none focus:outline-none focus-visible:mk-focusable placeholder:mk-text-fainter mk-text-secondary" />
                    <button disabled={resolving} onClick={()=>resolveAlert(detail)} className="h-10 rounded-md w-full bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 disabled:opacity-60">{resolving? 'Resolving...':'Mark Resolved'}</button>
                  </>
                )}
                {detail.status==='resolved' && <div className="text-[11px] mk-status-success inline-flex px-2 py-0.5 rounded-full font-medium">Resolved</div>}
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed mk-border rounded-lg flex items-center justify-center text-xs mk-text-faint">Select an alert to view details</div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={!!detail && window.innerWidth < 768} onClose={()=>setDetail(null)} title={detail? detail.type:''}>
        {detail && (
          <div className="space-y-4 text-sm mk-text-secondary">
            <div className="flex flex-wrap gap-2 text-[11px] mk-text-faint">
              {severityBadge(detail.severity)}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-300 font-medium"><MapPin size={12}/>{detail.zone}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="opacity-60"/>{relative(detail.ts)}</span>
              {statusBadge(detail.status)}
            </div>
            <div className="text-xs leading-relaxed mk-text-secondary whitespace-pre-wrap">{detail.description}</div>
            {detail.linkedTaskId && <div className="text-[11px]"><span className="font-medium mk-text-muted">Linked Task:</span> <button className="text-[var(--mk-accent)] underline hover:brightness-110">{detail.linkedTaskId}</button></div>}
            <div className="space-y-3">
              {detail.status==='new' && <button onClick={()=>ackAlert(detail)} className="h-10 rounded-md w-full bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium">Acknowledge</button>}
              {detail.status!=='resolved' && (
                <>
                  <textarea value={report} onChange={e=>setReport(e.target.value)} placeholder="Add short report" rows={3} className="w-full text-xs rounded-md mk-border mk-surface-alt p-2 resize-none focus:outline-none focus-visible:mk-focusable placeholder:mk-text-fainter mk-text-secondary" />
                  <button disabled={resolving} onClick={()=>resolveAlert(detail)} className="h-10 rounded-md w-full bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium disabled:opacity-60">{resolving? 'Resolving...':'Mark Resolved'}</button>
                </>
              )}
              {detail.status==='resolved' && <div className="text-[11px] mk-status-success inline-flex px-2 py-0.5 rounded-full font-medium">Resolved</div>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Alerts;
