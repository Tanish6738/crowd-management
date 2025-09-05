import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Drawer from '../../General/Drawer';
import { CheckCircle2, Clock, AlertCircle, Play, Flag, Image as ImageIcon } from 'lucide-react';

/** @typedef {{ id:string; title:string; description:string; zone:string; status:'new'|'in_progress'|'done'|'cancelled'; assignedAt:string; completedAt?:string; }} Task */

const relative = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const d=Math.floor(h/24); return d+'d';
};

const statusColors = {
  new: 'bg-blue-500/15 mk-text-secondary border-blue-400/30',
  in_progress: 'bg-amber-500/15 mk-text-secondary border-amber-400/30',
  done: 'bg-green-500/15 mk-text-secondary border-green-400/30',
  cancelled: 'mk-surface-alt mk-text-fainter mk-border'
};

const Tasks = ({ volunteerId }) => {
  const [tasks, setTasks] = useState(/** @type {Task[]} */([]));
  const [history, setHistory] = useState(/** @type {Task[]} */([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // active | history
  const [detail, setDetail] = useState(/** @type {Task|null} */(null));
  const [completing, setCompleting] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState('');

  // Fetch assigned tasks
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      await new Promise(r=>setTimeout(r, 550));
      const seed = [
        { id:'t1', title:'Distribute water bottles', description:'Provide water to pilgrims near east gate.', zone:'Zone 7', status:'new', assignedAt:new Date(Date.now()-18*60000).toISOString() },
        { id:'t2', title:'Guide lost child', description:'Assist child found near info booth to reunite with parents.', zone:'Zone 5', status:'in_progress', assignedAt:new Date(Date.now()-40*60000).toISOString() },
      ];
      const hist = [
        { id:'tH1', title:'Report obstruction', description:'Clear walkway near tent cluster.', zone:'Zone 4', status:'done', assignedAt:new Date(Date.now()-3*3600_000).toISOString(), completedAt:new Date(Date.now()-2*3600_000).toISOString() },
      ];
      setTasks(seed);
      setHistory(hist);
      setLoading(false);
    } catch(e){ setError('Failed to load tasks'); setLoading(false);}    
  }, []);

  useEffect(()=>{ load(); }, [load]);

  // WebSocket simulation for new tasks
  useEffect(()=>{
    if(loading) return; const iv=setInterval(()=>{
      setTasks(prev => [{ id:'t'+Date.now(), title:'Assist at checkpoint', description:'Support crowd flow and answer queries.', zone:'Zone '+(Math.floor(Math.random()*9)+1), status:'new', assignedAt:new Date().toISOString() }, ...prev]);
    }, 45000);
    return ()=>clearInterval(iv);
  }, [loading]);

  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');

  const openDetail = (task) => { setDetail(task); setPhoto(null); setNotes(''); };

  const patchTask = (id, updater) => setTasks(ts => ts.map(t => t.id===id? { ...t, ...updater }: t));

  const acceptTask = async (task) => { patchTask(task.id, { status:'in_progress' }); setDetail(d => d && d.id===task.id? { ...d, status:'in_progress'}: d); };
  const startTask = async (task) => { if(task.status==='new') acceptTask(task); };
  const completeTask = async (task) => {
    if(!photo) { alert('Attach a photo before completing.'); return; }
    setCompleting(true);
    try {
      // Simulated upload & completion API
      await new Promise(r=>setTimeout(r, 900));
      const completed = { ...task, status:'done', completedAt: new Date().toISOString() };
      setTasks(ts => ts.filter(t => t.id!==task.id));
      setHistory(h => [completed, ...h]);
      setDetail(null);
    } finally { setCompleting(false); }
  };

  const onPhotoChange = (e) => { const file=e.target.files?.[0]; if(file) setPhoto(file); };

  const statusPill = (status) => <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[status]}`}>{status.replace('_',' ')}</span>;

  const TaskCard = ({ task }) => (
    <button
      onClick={()=>openDetail(task)}
      className="w-full text-left rounded-lg mk-border mk-surface-alt backdrop-blur-sm p-4 flex flex-col gap-3 active:scale-[0.99] transition group hover:bg-orange-50 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
      aria-label={task.title}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2 flex-1 group-hover:text-white">{task.title}</h3>
        {statusPill(task.status)}
      </div>
      <div className="flex items-center gap-2 text-[11px] mk-text-muted">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium">{task.zone}</span>
        <span className="flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(task.assignedAt)}</span>
      </div>
    </button>
  );

  const skeleton = Array.from({length:4}).map((_,i)=>(
    <div key={i} className="h-24 bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse rounded-lg"/>
  ));

  return (
  <div className="space-y-4 mk-text-primary" aria-label="Volunteer tasks">
      {/* Tab Switch */}
      <div className="flex gap-2 text-xs font-medium">
        <button onClick={()=>setActiveTab('active')} className={`px-3 py-1.5 rounded-full border transition ${activeTab==='active'? 'bg-gradient-to-r from-[var(--mk-accent)] to-[var(--mk-accent-strong)] text-[#081321] border-[var(--mk-accent)] shadow hover:brightness-110':'mk-surface-alt mk-border mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10'}`}>Active</button>
        <button onClick={()=>setActiveTab('history')} className={`px-3 py-1.5 rounded-full border transition ${activeTab==='history'? 'bg-gradient-to-r from-[var(--mk-accent)] to-[var(--mk-accent-strong)] text-[#081321] border-[var(--mk-accent)] shadow hover:brightness-110':'mk-surface-alt mk-border mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10'}`}>History</button>
        <div className="ml-auto text-[11px] mk-text-fainter flex items-center gap-1"><AlertCircle size={12} className="text-orange-400"/> Updated live</div>
      </div>

      {loading && <div className="grid gap-3">{skeleton}</div>}
      {!loading && error && (
  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/40 text-sm flex justify-between items-center text-red-300">
          <span>{error}</span>
          <button onClick={load} className="underline hover:text-red-200">Retry</button>
        </div>
      )}

      {!loading && !error && activeTab==='active' && (
        <div className="grid gap-3">
          {activeTasks.length === 0 && <div className="p-10 text-center text-sm mk-text-muted mk-surface-alt mk-border rounded-lg">No active tasks yet.</div>}
          {activeTasks.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      )}

      {!loading && !error && activeTab==='history' && (
        <div className="grid gap-3">
          {history.length === 0 && <div className="p-10 text-center text-sm mk-text-muted mk-surface-alt mk-border rounded-lg">No past tasks.</div>}
          {history.map(t => (
            <div key={t.id} className="rounded-lg mk-border mk-surface-alt p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm mk-text-primary line-clamp-2">{t.title}</h3>
                {statusPill(t.status)}
              </div>
              <div className="flex items-center gap-2 text-[11px] mk-text-muted">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium">{t.zone}</span>
                <span className="flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>Assigned {relative(t.assignedAt)}</span>
                {t.completedAt && <span className="flex items-center gap-1 text-green-300"><CheckCircle2 size={12} className="text-green-300"/>Done {relative(t.completedAt)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={!!detail} onClose={()=>setDetail(null)} title={detail? detail.title: ''}>
        {detail && (
          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium">{detail.zone}</span>
                {statusPill(detail.status)}
                <span className="flex items-center gap-1 text-white/50"><Clock size={12}/><span>Assigned {relative(detail.assignedAt)}</span></span>
              </div>
              <p className="leading-relaxed text-white/80 whitespace-pre-wrap">{detail.description}</p>
            </div>

            {detail.status !== 'done' && detail.status !== 'cancelled' && (
              <div className="space-y-3">
                {detail.status === 'new' && (
                  <button onClick={()=>acceptTask(detail)} className="w-full h-11 rounded-md bg-blue-600/80 hover:bg-blue-600 text-white font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"><Play size={16}/> Accept Task</button>
                )}
                {detail.status === 'in_progress' && (
                  <>
                    <label className="block text-xs font-medium text-white/60">Completion Photo</label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/*" capture="environment" onChange={onPhotoChange} className="text-xs" aria-label="Upload completion photo" />
                      {photo && <span className="text-[11px] text-green-300 font-medium flex items-center gap-1"><ImageIcon size={14}/> {photo.name.slice(0,18)}</span>}
                    </div>
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add notes (optional)" rows={3} className="w-full text-xs rounded-md border border-white/10 bg-white/5 p-2 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:text-white/40 text-white" />
                    <button disabled={completing} onClick={()=>completeTask(detail)} className="w-full h-11 rounded-md bg-green-600/80 hover:bg-green-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60">
                      {completing? 'Completing...' : <><Flag size={16}/> Complete Task</>}
                    </button>
                  </>
                )}
              </div>
            )}

            {detail.status === 'done' && detail.completedAt && (
              <div className="text-xs text-green-300 flex items-center gap-1"><CheckCircle2 size={14}/> Completed {relative(detail.completedAt)}</div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Tasks;