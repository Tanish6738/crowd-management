import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  AlertTriangle,
  FileBarChart2,
  Download,
  Search as SearchIcon,
  Filter,
  Clock,
  MapPin,
  Users,
  Activity,
  PieChart as PieIcon,
  BarChart3,
  ListChecks,
  PackageSearch,
  ChevronDown,
  List as ListIcon,
  Activity as LineChartIcon,
  BarChart3 as BarChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';

// type ReportSummary = { category:'lostfound'|'alerts'|'tasks'; count:number; trend:number[] };
// type IncidentReport = { id:string; type:string; zoneName:string; severity:'low'|'medium'|'high'|'critical'; ts:string; status:'open'|'resolved'|'dismissed' };

const severityColor = (s) => ({ low:'#6b7280', medium:'#f59e0b', high:'#f97316', critical:'#dc2626' }[s] || '#9ca3af');

const Reports = () => {
  const [tab, setTab] = useState('lostfound'); // lostfound | alerts | tasks | export
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [lostReports, setLostReports] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [taskTrend, setTaskTrend] = useState([]);
  const [alertSeverity, setAlertSeverity] = useState([]);
  const [density, setDensity] = useState('comfortable'); // comfortable | compact
  const [chartType, setChartType] = useState('line'); // line | bar
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    setLoading(true); setError(null);
    const to = setTimeout(() => {
      const lr = Array.from({ length: 12 }).map((_,i)=> ({ id:'lr'+(i+1), person:'Person '+(i+1), status:['open','matched','closed'][i%3], lastSeen:['Gate A','Riverbank','Transit Hub'][i%3], age:10+i, ts:new Date(Date.now()-i*3600000).toISOString() }));
      const inc = Array.from({ length: 15 }).map((_,i)=> ({ id:'inc'+(i+1), type:['Overcrowding','SOS','Incident','Camera Offline'][i%4], zoneName:['Gate A','Riverbank','Transit Hub','Food Court'][i%4], severity:['low','medium','high','critical'][i%4], ts:new Date(Date.now()-i*1800000).toISOString(), status:['open','resolved','dismissed'][i%3] }));
      const taskT = Array.from({ length: 14 }).map((_,i)=> ({ day:'D'+(i+1), completed: Math.floor(Math.random()*40)+20, pending: Math.floor(Math.random()*20)+5 }));
      const alertS = ['low','medium','high','critical'].map(s => ({ severity:s, count: Math.floor(Math.random()*40)+5 }));
      setLostReports(lr); setIncidents(inc); setTaskTrend(taskT); setAlertSeverity(alertS); setLoading(false);
    }, 700);
    return () => clearTimeout(to);
  }, [dateRange]);

  const lostSummary = useMemo(() => {
    const open = lostReports.filter(r=>r.status==='open').length;
    const matched = lostReports.filter(r=>r.status==='matched').length;
    const closed = lostReports.filter(r=>r.status==='closed').length;
    return [
      { label:'Open', value: open, color:'#f97316' },
      { label:'Matched', value: matched, color:'#2563eb' },
      { label:'Closed', value: closed, color:'#16a34a' },
    ];
  }, [lostReports]);

  const alertSeverityPie = useMemo(() => alertSeverity.map(a => ({ name:a.severity, value:a.count })), [alertSeverity]);
  const pieColors = ['#6b7280','#f59e0b','#f97316','#dc2626'];

  const loadingTable = <div className="space-y-2">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-10 rounded bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse" />))}</div>;
  const emptyState = (
    <div className="p-8 text-sm mk-text-muted text-center border border-dashed mk-border rounded-lg mk-surface-alt backdrop-blur-sm flex flex-col items-center gap-3">
      <PackageSearch className="text-orange-600 dark:text-orange-400" size={40} />
      <p>No reports match your filters.</p>
    </div>
  );
  const errorBanner = <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-300 text-sm flex items-center justify-between rounded border border-red-500/30">Error loading reports <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white/90 text-xs hover:bg-red-500">Retry</button></div>;

  const filteredLost = lostReports.filter(r => search.trim()==='' || r.person.toLowerCase().includes(search.toLowerCase()) || r.lastSeen.toLowerCase().includes(search.toLowerCase()));
  const filteredIncidents = incidents.filter(i => (
    (severityFilter==='all' || i.severity===severityFilter) && (
      search.trim()==='' || i.type.toLowerCase().includes(search.toLowerCase()) || i.zoneName.toLowerCase().includes(search.toLowerCase())
    )
  ));

  const kpis = useMemo(()=> ({
    lostOpen: lostReports.filter(r=>r.status==='open').length,
    incidents: incidents.length,
    criticalInc: incidents.filter(i=>i.severity==='critical').length,
    tasksCompleted: taskTrend.reduce((a,c)=>a+c.completed,0),
    alertsTotal: alertSeverity.reduce((a,c)=>a+c.count,0)
  }), [lostReports, incidents, taskTrend, alertSeverity]);

  const rowPad = density==='compact' ? 'py-1.5' : 'py-2';

  // Export placeholder ------------------------------------------------------
  const handleExport = (type) => {
    // Placeholder - integrate real export later
    alert('Exporting '+type+' (placeholder)');
  };

  return (
  <div className="space-y-6 mk-text-primary" aria-label="Reports">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold mk-text-primary flex items-center gap-2"><FileBarChart2 size={18} className="text-orange-500"/> Reports</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            {k:'lostfound', label:'Lost & Found', icon:ClipboardList},
            {k:'alerts', label:'Alerts', icon:AlertTriangle},
            {k:'tasks', label:'Tasks', icon:ListChecks},
            {k:'export', label:'Export', icon:Download},
          ].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} className={`px-3 py-1.5 rounded-md border flex items-center gap-1 transition-colors ${tab===t.k ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'mk-surface-alt mk-border mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-text-primary'}`}> <t.icon size={14}/> {t.label}</button>
          ))}
        </div>
  <div className="hidden md:flex items-center gap-2 ml-auto text-xs">
          <select value={dateRange} onChange={e=>setDateRange(e.target.value)} className="h-9 rounded-md border mk-border mk-surface-alt px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {['24h','48h','7d','30d'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 rounded-md border mk-border mk-surface-alt px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {['all','Gate A','Riverbank','Transit Hub','Food Court'].map(z => <option key={z} value={z}>{z==='all' ? 'All Zones' : z}</option>)}
          </select>
          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="h-9 rounded-md border mk-border mk-surface-alt px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {['all','lostfound','crowd','tasks'].map(c => <option key={c} value={c}>{c==='all' ? 'All Categories' : c}</option>)}
          </select>
          {tab==='alerts' && (
            <select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} className="h-9 rounded-md border mk-border mk-surface-alt px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
              {['all','low','medium','high','critical'].map(s => <option key={s} value={s}>{s==='all'?'All Severities':s}</option>)}
            </select>
          )}
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 mk-text-muted"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-9 pl-7 pr-2 w-40 rounded-md border mk-border mk-surface-alt focus:bg-orange-50 dark:focus:bg-white/10 mk-text-primary placeholder:mk-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
          <button onClick={()=>setDensity(d=>d==='compact'?'comfortable':'compact')} className="h-9 px-3 rounded-md border mk-border mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 flex items-center gap-1 mk-text-muted hover:mk-text-primary" aria-label="Toggle density">
            <ListIcon size={14}/> {density==='compact'?'Comfort':'Compact'}
          </button>
        </div>
        <div className="flex md:hidden ml-auto gap-2">
          <button onClick={()=>setShowFilters(f=>!f)} className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1 ${showFilters? 'bg-orange-500 text-white border-orange-500':'mk-surface-alt mk-border mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-text-primary'}`}><Filter size={14}/> Filters</button>
        </div>
      </div>
      {/* Mobile Filter Panel */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="md:hidden bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-3 space-y-3 text-xs text-white/70">
            <div className="flex gap-2">
              <select value={dateRange} onChange={e=>setDateRange(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">{['24h','48h','7d','30d'].map(r => <option key={r}>{r}</option>)}</select>
              <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">{['all','Gate A','Riverbank','Transit Hub','Food Court'].map(z => <option key={z} value={z}>{z==='all' ? 'All Zones' : z}</option>)}</select>
            </div>
            <div className="flex gap-2">
              <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">{['all','lostfound','crowd','tasks'].map(c => <option key={c}>{c==='all' ? 'All Categories' : c}</option>)}</select>
              {tab==='alerts' && (
                <select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">{['all','low','medium','high','critical'].map(s => <option key={s}>{s==='all'?'All Severities':s}</option>)}</select>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 pl-7 pr-2 w-full rounded border border-white/10 bg-white/5 focus:bg-white/10 text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <button onClick={()=>setDensity(d=>d==='compact'?'comfortable':'compact')} className="h-8 px-3 rounded border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1"><ListIcon size={14}/> {density==='compact'?'Comfort':'Compact'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* KPI Summary */}
      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3 text-[11px]">
        {[
          {label:'Open Lost', value:kpis.lostOpen, icon:ClipboardList, color:'text-orange-300 bg-orange-500/10 border-orange-400/30'},
          {label:'Incidents', value:kpis.incidents, icon:AlertTriangle, color:'text-red-300 bg-red-500/10 border-red-400/30'},
          {label:'Critical Inc.', value:kpis.criticalInc, icon:Activity, color:'text-red-300 bg-red-500/10 border-red-400/30'},
          {label:'Tasks Done', value:kpis.tasksCompleted, icon:ListChecks, color:'text-green-300 bg-green-500/10 border-green-400/30'},
          {label:'Alerts', value:kpis.alertsTotal, icon:PieIcon, color:'text-blue-300 bg-blue-500/10 border-blue-400/30'}
        ].map(card => (
          <div key={card.label} className={`p-2 rounded-lg border flex items-center gap-2 backdrop-blur-sm ${card.color}`}>
            <card.icon size={16}/>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide font-medium">{card.label}</div>
              <div className="text-sm font-semibold tabular-nums text-white/90">{card.value}</div>
            </div>
          </div>
        ))}
      </div>
      {error && errorBanner}
      {tab==='lostfound' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-4 backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">Lost & Found Summary</h3>
              {loading ? <div className="h-28 rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" /> : (
                <div className="grid grid-cols-3 gap-3">
                  {lostSummary.map(s => (
                    <div key={s.label} className="p-2 rounded-md border border-white/10 bg-white/5 flex flex-col items-start gap-1">
                      <span className="flex items-center gap-1 text-[10px] font-medium" style={{color:s.color}}><span className="w-2 h-2 rounded-full" style={{ background:s.color }} /> {s.label}</span>
                      <span className="text-sm font-semibold tabular-nums text-white/90">{s.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-4 h-[260px] backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">Alert Severity Split</h3>
              {loading ? <div className="h-[180px] rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={alertSeverityPie} dataKey="value" nameKey="name" outerRadius={70} innerRadius={30} paddingAngle={3}>
                      {alertSeverityPie.map((e,i)=>(<Cell key={i} fill={pieColors[i%pieColors.length]} />))}
                    </Pie>
                    <Tooltip wrapperClassName="text-xs" contentStyle={{background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#fff'}}/>
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-4 backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-3">Lost Reports</h3>
              {loading ? loadingTable : filteredLost.length===0 ? emptyState : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-white/80">
                    <thead className="bg-white/5 text-white/70">
                      <tr>{['Person Name','Status','Last Seen','Age','Actions'].map(h => <th key={h} className="px-3 py-2 font-medium text-[10px] uppercase tracking-wide text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {filteredLost.map(r => (
                          <motion.tr
                            key={r.id}
                            initial={{opacity:0, y:8}}
                            animate={{opacity:1, y:0}}
                            exit={{opacity:0, y:-6}}
                            className="even:bg-white/5 hover:bg-white/10"
                          >
                            <td className={`px-3 ${rowPad} whitespace-nowrap`}>{r.person}</td>
                            <td className={`px-3 ${rowPad} whitespace-nowrap`}>
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${r.status==='open'?'bg-orange-500/15 text-orange-300 border-orange-400/30': r.status==='matched'?'bg-blue-500/15 text-blue-300 border-blue-400/30':'bg-green-500/15 text-green-300 border-green-400/30'}`}>{r.status}</span>
                            </td>
                            <td className={`px-3 ${rowPad} whitespace-nowrap`}>{r.lastSeen}</td>
                            <td className={`px-3 ${rowPad} whitespace-nowrap`}>{r.age}</td>
                            <td className={`px-3 ${rowPad} whitespace-nowrap`}><button className="text-orange-400 hover:underline">View</button></td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-4 h-[300px] backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-3">Daily Tasks Completion Trend</h3>
              {loading ? <div className="h-[220px] rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={taskTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="day" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:10 }} />
                    <Tooltip wrapperClassName="text-xs" contentStyle={{background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#fff'}}/>
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2} />
                    <Line type="monotone" dataKey="pending" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
      {tab==='alerts' && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-4 h-[320px] backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">Alerts by Type (7d)</h3>
            {loading ? <div className="h-[240px] rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={['Overcrowding','SOS','Camera Offline','Incident'].map(t => ({ type:t, count: Math.floor(Math.random()*80)+10 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="type" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip wrapperClassName="text-xs" contentStyle={{background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#fff'}}/>
                  <Bar dataKey="count" fill="#f97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-4 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-3">Incidents</h3>
            {loading ? loadingTable : filteredIncidents.length===0 ? emptyState : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-white/80">
                  <thead className="bg-white/5 text-white/70"><tr>{['Type','Zone','Time','Severity','Status'].map(h => <th key={h} className="px-3 py-2 font-medium text-[10px] uppercase tracking-wide text-left">{h}</th>)}</tr></thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {filteredIncidents.map(inc => (
                        <motion.tr
                          key={inc.id}
                          initial={{opacity:0, y:8}}
                          animate={{opacity:1, y:0}}
                          exit={{opacity:0, y:-6}}
                          className="even:bg-white/5 hover:bg-white/10"
                        >
                          <td className={`px-3 ${rowPad} whitespace-nowrap`}>{inc.type}</td>
                          <td className={`px-3 ${rowPad} whitespace-nowrap`}>{inc.zoneName}</td>
                          <td className={`px-3 ${rowPad} whitespace-nowrap`}>{new Date(inc.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                          <td className={`px-3 ${rowPad} whitespace-nowrap`}>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full" style={{ background: severityColor(inc.severity) }} />{inc.severity}
                            </span>
                          </td>
                          <td className={`px-3 ${rowPad} whitespace-nowrap`}>
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${inc.status==='open'?'bg-orange-500/15 text-orange-300 border-orange-400/30': inc.status==='resolved'?'bg-green-500/15 text-green-300 border-green-400/30':'bg-white/5 text-white/60 border-white/10'}`}>{inc.status}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {tab==='tasks' && (
              <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-4 h-[340px] flex flex-col backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide flex-1">Task Completion Trend</h3>
                  <button onClick={()=>setChartType(t=>t==='line'?'bar':'line')} className="h-8 px-2 rounded border border-white/10 bg-white/5 text-[11px] flex items-center gap-1 hover:bg-white/10 text-white/70 hover:text-white">{chartType==='line'?<BarChartIcon size={14}/>:<LineChartIcon size={14}/>}{chartType==='line'?'Bar':'Line'}</button>
                </div>
                {loading ? <div className="flex-1 rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType==='line' ? (
                      <LineChart data={taskTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="day" tick={{ fontSize:10 }} />
                        <YAxis tick={{ fontSize:10 }} />
                        <Tooltip wrapperClassName="text-xs" contentStyle={{background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#fff'}}/>
                        <Legend wrapperStyle={{ fontSize:11 }} />
                        <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2} />
                        <Line type="monotone" dataKey="pending" stroke="#f97316" strokeWidth={2} />
                      </LineChart>
                    ) : (
                      <BarChart data={taskTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="day" tick={{ fontSize:10 }} />
                        <YAxis tick={{ fontSize:10 }} />
                        <Tooltip wrapperClassName="text-xs" contentStyle={{background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#fff'}}/>
                        <Legend wrapperStyle={{ fontSize:11 }} />
                        <Bar dataKey="completed" fill="#16a34a" radius={[4,4,0,0]} />
                        <Bar dataKey="pending" fill="#f97316" radius={[4,4,0,0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            )}
      {tab==='export' && (
        <div className="bg-white/5 rounded-lg border border-white/10 shadow-sm p-6 space-y-5 backdrop-blur-sm">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Download size={16} className="text-orange-500"/> Export Data</h3>
            <p className="text-xs text-white/60 mt-1">Download CSV or PDF snapshots for auditing & offline analysis.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            {[
              {label:'Incidents CSV', type:'incidents_csv'},
              {label:'Incidents PDF', type:'incidents_pdf'},
              {label:'Alerts CSV', type:'alerts_csv'},
              {label:'Alerts PDF', type:'alerts_pdf'},
              {label:'Tasks CSV', type:'tasks_csv'},
              {label:'Tasks PDF', type:'tasks_pdf'}
            ].map(btn => (
              <button key={btn.type} onClick={()=>handleExport(btn.label)} className="px-3 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1 font-medium text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                <Download size={14} className="text-orange-400"/> {btn.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-white/50">Exports are generated from current filters and are placeholders. Integrate backend endpoints for real files.</div>
        </div>
      )}
    </div>
  );
};

export default Reports;
