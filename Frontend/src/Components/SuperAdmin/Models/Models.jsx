import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../General/Modal';
import Drawer from '../../General/Drawer';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Layers3,
	UploadCloud,
	Rocket,
	RotateCcw,
	Trash2,
	Activity,
	Cpu,
	Gauge,
	RefreshCcw,
	CheckCircle2,
	XCircle
} from 'lucide-react';

/**
 * @typedef {Object} Model
 * @property {string} id
 * @property {string} name
 * @property {string} version
 * @property {'face'|'crowd'|'other'} type
 * @property {number} accuracy
 * @property {number} latencyMs
 * @property {number} embeddingsPerSec
 * @property {string[]} deployedTenants
 * @property {string} uploadedBy
 * @property {string} createdAt
 */

const seedModels = () => ([
	{ id:'m1', name:'FaceRec', version:'1.3.0', type:'face', accuracy:97.2, latencyMs:42, embeddingsPerSec:1600, deployedTenants:['Kumbh Core','Transit Hub'], uploadedBy:'priya', createdAt:new Date(Date.now()-3600_000*5).toISOString() },
	{ id:'m2', name:'CrowdCount', version:'2.1.1', type:'crowd', accuracy:93.5, latencyMs:55, embeddingsPerSec:1200, deployedTenants:['Kumbh Core','Riverbank Ops','North Camp'], uploadedBy:'arjun', createdAt:new Date(Date.now()-3600_000*12).toISOString() },
	{ id:'m3', name:'AlertClassify', version:'0.9.5', type:'other', accuracy:88.1, latencyMs:70, embeddingsPerSec:800, deployedTenants:['Riverbank Ops'], uploadedBy:'system', createdAt:new Date(Date.now()-3600_000*30).toISOString() },
]);

const typeBadge = (t) => ({
	face:'bg-purple-100 text-purple-700 border-purple-200',
	crowd:'bg-orange-100 text-orange-700 border-orange-200',
	other:'bg-gray-100 text-gray-600 border-gray-300'
}[t]);

const Models = () => {
	const [models, setModels] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [search, setSearch] = useState('');
	const [typeFilter, setTypeFilter] = useState('all');
	const [sort, setSort] = useState({ key:'name', dir:'asc' });
	const [detail, setDetail] = useState(null); // Model
	const [uploadOpen, setUploadOpen] = useState(false);
	const [deployModel, setDeployModel] = useState(null); // Model target for deploy
	const [deploySelection, setDeploySelection] = useState([]);
	const [rollingBack, setRollingBack] = useState(false);
	const [deleting, setDeleting] = useState(null);
	const [uploadForm, setUploadForm] = useState({ name:'', version:'', type:'face', file:null });
	const [uploading, setUploading] = useState(false);
	const tenantsUniverse = ['Kumbh Core','Riverbank Ops','Transit Hub','North Camp','West Gate'];

	// Simulated fetch
	useEffect(()=>{
		setLoading(true); setError(null);
		const t = setTimeout(()=>{ try { setModels(seedModels()); setLoading(false);} catch(e){ setError('Failed to load models'); setLoading(false);} }, 700);
		return ()=>clearTimeout(t);
	}, []);

	// Simulated WS metric update every 35s
	useEffect(()=>{
		if (loading) return;
		const iv = setInterval(()=>{
			setModels(prev => prev.map(m => ({ ...m, accuracy: +(m.accuracy + (Math.random()*0.2-0.1)).toFixed(2), latencyMs: Math.max(30, Math.round(m.latencyMs + (Math.random()*4-2))) })));
		}, 35000);
		return ()=>clearInterval(iv);
	}, [loading]);

	const relative = (iso) => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m ago'; const h=Math.floor(m/60); if(h<24) return h+'h ago'; const da=Math.floor(h/24); return da+'d ago'; };

	const toggleSort = (key) => setSort(s => s.key===key ? { key, dir: s.dir==='asc'?'desc':'asc'} : { key, dir:'asc'});

	const filtered = useMemo(()=> models.filter(m => {
		if (typeFilter!=='all' && m.type!==typeFilter) return false; if (search.trim()) { const s=search.toLowerCase(); if(!m.name.toLowerCase().includes(s) && !m.version.toLowerCase().includes(s)) return false; }
		return true; }), [models, typeFilter, search]);
	const sorted = useMemo(()=> [...filtered].sort((a,b)=>{ let av=a[sort.key]; let bv=b[sort.key]; if(sort.key==='createdAt'){ av=new Date(a.createdAt).getTime(); bv=new Date(b.createdAt).getTime(); } if(typeof av==='string') av=av.toLowerCase(); if(typeof bv==='string') bv=bv.toLowerCase(); if(av<bv) return sort.dir==='asc'?-1:1; if(av>bv) return sort.dir==='asc'?1:-1; return 0; }), [filtered, sort]);

	const skeletonRows = () => Array.from({length:6}).map((_,i)=>(<tr key={i} className="animate-pulse"><td colSpan={8} className="h-10"><div className="h-6 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"/></td></tr>));

	const validateFile = (file) => file && (/\.(onnx|pt)$/i).test(file.name);

	const submitUpload = (e) => { e.preventDefault(); if(!validateFile(uploadForm.file)) return; setUploading(true); setTimeout(()=>{ const newModel={ id:'m'+Date.now(), name:uploadForm.name.trim(), version: uploadForm.version.trim(), type: uploadForm.type, accuracy: 0, latencyMs: 0, embeddingsPerSec:0, deployedTenants:[], uploadedBy:'you', createdAt:new Date().toISOString()}; setModels(m=>[newModel, ...m]); setUploading(false); setUploadOpen(false); setUploadForm({ name:'', version:'', type:'face', file:null }); }, 1100); };

	const openDeploy = (m) => { setDeployModel(m); setDeploySelection(m.deployedTenants); };
	const toggleTenant = (tn) => setDeploySelection(sel => sel.includes(tn)? sel.filter(x=>x!==tn): [...sel, tn]);
	const saveDeploy = () => { setModels(prev => prev.map(m => m.id===deployModel.id? { ...m, deployedTenants: deploySelection } : m)); setDeployModel(null); setDeploySelection([]); };

	const rollbackModel = (m) => { setRollingBack(true); setTimeout(()=>{ /* placeholder rollback logic */ setRollingBack(false); }, 900); };
	const deleteModel = (m) => { setModels(prev => prev.filter(x => x.id!==m.id)); setDeleting(null); if(detail && detail.id===m.id) setDetail(null); };

	const headerCell = (label,key,sortable=true)=>(<th key={key} onClick={()=>sortable && toggleSort(key)} className={`px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide cursor-${sortable?'pointer':'default'} select-none`}>{label} {sort.key===key && <span className="text-orange-600">{sort.dir==='asc'?'▲':'▼'}</span>}</th>);

	const tableBody = () => {
		if (loading) return <tbody>{skeletonRows()}</tbody>;
		if (error) return <tbody><tr><td colSpan={8} className="p-6 text-center text-sm text-red-600">{error} <button onClick={()=>window.location.reload()} className="underline ml-1">Retry</button></td></tr></tbody>;
		if (!sorted.length) return <tbody><tr><td colSpan={8} className="p-10 text-center text-sm text-gray-500 flex flex-col items-center gap-4">No models uploaded yet.<button onClick={()=>setUploadOpen(true)} className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs">Upload Model</button></td></tr></tbody>;
		return <tbody><AnimatePresence initial={false}>{sorted.map(m => (
			<motion.tr key={m.id} layout initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} className="even:bg-gray-50 hover:bg-orange-50 cursor-pointer" onClick={()=> setDetail(m)}>
				<td className="px-3 py-2 font-medium text-gray-800">{m.name}</td>
				<td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${typeBadge(m.type)}`}>{m.type}</span></td>
				<td className="px-3 py-2 tabular-nums text-gray-700">{m.version}</td>
				<td className="px-3 py-2 tabular-nums">{m.accuracy.toFixed(2)}%</td>
				<td className="px-3 py-2 tabular-nums">{m.deployedTenants.length}</td>
				<td className="px-3 py-2 whitespace-nowrap">{relative(m.createdAt)}</td>
				<td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
					<div className="flex gap-2 text-[11px]">
						<button onClick={()=>setDetail(m)} className="text-orange-600 hover:underline" aria-label={`View model ${m.name}`}>View</button>
						<button onClick={()=>openDeploy(m)} className="text-gray-600 hover:underline" aria-label={`Deploy model ${m.name}`}>Deploy</button>
						<button onClick={()=>rollbackModel(m)} className="text-gray-600 hover:underline" aria-label={`Rollback model ${m.name}`}>Rollback</button>
						<button onClick={()=>setDeleting(m)} className="text-red-600 hover:underline" aria-label={`Delete model ${m.name}`}>Delete</button>
					</div>
				</td>
			</motion.tr>))}</AnimatePresence></tbody>;
	};

	const kpis = useMemo(()=> ({ total: models.length, deployed: models.reduce((a,m)=> a + (m.deployedTenants.length>0?1:0),0), face: models.filter(m=>m.type==='face').length }), [models]);

	const kpiTiles = (
		<div className="grid sm:grid-cols-3 gap-3 text-[11px]">
			{[
				{label:'Total Models', value:kpis.total, style:'bg-orange-50 text-orange-700 border-orange-200'},
				{label:'With Deployments', value:kpis.deployed, style:'bg-green-50 text-green-700 border-green-200'},
				{label:'Face Models', value:kpis.face, style:'bg-purple-50 text-purple-700 border-purple-200'}
			].map(t => (
				<div key={t.label} className={`p-2 rounded-lg border flex items-center gap-2 ${t.style}`}>
					<div className="flex-1 min-w-0">
						<div className="text-[10px] uppercase tracking-wide font-medium">{t.label}</div>
						<div className="text-sm font-semibold tabular-nums">{t.value}</div>
					</div>
				</div>
			))}
		</div>
	);

	return (
		<div className="space-y-6" aria-label="Models Management">
			<div className="flex flex-wrap items-center gap-3">
				<h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Layers3 size={18} className="text-orange-600"/> Models</h2>
				<div className="hidden md:flex items-center gap-2 ml-auto text-xs">
					<select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2">
						<option value="all">All Types</option><option value="face">Face</option><option value="crowd">Crowd</option><option value="other">Other</option>
					</select>
					<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search models" className="h-9 w-52 rounded-md border border-gray-300 bg-gray-100 focus:bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
					<button onClick={()=>setUploadOpen(true)} className="h-9 px-3 rounded-md bg-orange-500 text-white font-medium flex items-center gap-1"><UploadCloud size={14}/> Upload Model</button>
				</div>
				<div className="flex md:hidden gap-2 ml-auto">
					<button onClick={()=>setUploadOpen(true)} className="h-9 px-3 rounded-md bg-orange-500 text-white text-xs font-medium flex items-center gap-1"><UploadCloud size={14}/> Upload</button>
				</div>
			</div>

			{kpiTiles}

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-auto max-h-[560px]">
					<table className="min-w-full text-xs">
						<thead className="bg-gray-100/80 text-gray-700 sticky top-0 z-10">
							<tr>
								{headerCell('Model Name','name')}
								{headerCell('Type','type')}
								{headerCell('Version','version')}
								{headerCell('Accuracy %','accuracy')}
								{headerCell('Deployed Tenants','#deploy')}
								{headerCell('Last Updated','createdAt')}
								<th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-left">Actions</th>
							</tr>
						</thead>
						{tableBody()}
					</table>
				</div>
			</div>

			{/* Upload Modal */}
			<Modal
				open={uploadOpen}
				onClose={()=> setUploadOpen(false)}
				title="Upload Model"
				actions={[
					<button key="cancel" disabled={uploading} onClick={()=>setUploadOpen(false)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs">Cancel</button>,
					<button key="upload" disabled={uploading || !uploadForm.name || !uploadForm.version || !validateFile(uploadForm.file)} onClick={submitUpload} className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-60">{uploading? <RefreshCcw size={14} className="animate-spin"/>:<UploadCloud size={14}/>} Upload</button>
				]}
			>
				<form onSubmit={submitUpload} className="space-y-5 text-sm">
					<div>
						<label className="block text-xs font-medium mb-1">Model Name</label>
						<input value={uploadForm.name} onChange={e=>setUploadForm(f=>({...f,name:e.target.value}))} required className="w-full h-8 rounded border border-gray-300 px-2" />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium mb-1">Version</label>
							<input value={uploadForm.version} onChange={e=>setUploadForm(f=>({...f,version:e.target.value}))} required className="w-full h-8 rounded border border-gray-300 px-2" />
						</div>
						<div>
							<label className="block text-xs font-medium mb-1">Type</label>
							<select value={uploadForm.type} onChange={e=>setUploadForm(f=>({...f,type:e.target.value}))} className="w-full h-8 rounded border border-gray-300 px-2">
								<option value="face">Face</option><option value="crowd">Crowd</option><option value="other">Other</option>
							</select>
						</div>
					</div>
					<div>
						<label className="block text-xs font-medium mb-1">Model File (.onnx / .pt)</label>
						<input type="file" accept=".onnx,.pt" onChange={e=> setUploadForm(f=>({...f,file:e.target.files?.[0]||null}))} className="w-full text-xs" />
						{uploadForm.file && !validateFile(uploadForm.file) && <div className="text-[10px] text-red-600 mt-1">Invalid file type.</div>}
					</div>
					<p className="text-[11px] text-gray-500">Uploading will benchmark accuracy & performance asynchronously.</p>
				</form>
			</Modal>

			{/* Deploy Modal */}
			<Modal
				open={!!deployModel}
				onClose={()=> setDeployModel(null)}
				title={deployModel? `Deploy ${deployModel.name} ${deployModel.version}`: ''}
				actions={deployModel? [
					<button key="cancel" onClick={()=> setDeployModel(null)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs">Cancel</button>,
					<button key="save" onClick={saveDeploy} className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium">Save</button>
				]: []}
			>
				{deployModel && (
					<div className="space-y-4 text-sm">
						<div className="text-xs text-gray-600">Select tenants to deploy this model to:</div>
						<div className="grid grid-cols-2 gap-2">
							{tenantsUniverse.map(t => (
								<label key={t} className="flex items-center gap-2 text-xs px-2 py-1 rounded border border-gray-200 hover:bg-orange-50 cursor-pointer">
									<input type="checkbox" className="accent-orange-600" checked={deploySelection.includes(t)} onChange={()=>toggleTenant(t)} />
									<span>{t}</span>
								</label>
							))}
						</div>
						<p className="text-[11px] text-gray-500">Deployment triggers rolling update per tenant.</p>
					</div>
				)}
			</Modal>

			{/* Delete Confirmation */}
			<Modal
				open={!!deleting}
				onClose={()=> setDeleting(null)}
				title={deleting? 'Delete Model' : ''}
				actions={deleting? [
					<button key="cancel" onClick={()=> setDeleting(null)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs">Cancel</button>,
					<button key="del" onClick={()=> deleteModel(deleting)} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium">Delete</button>
				]: []}
			>
				{deleting && <p className="text-[11px] text-gray-600">This will remove the model. Tenants currently using it will revert to previous version.</p>}
			</Modal>

			{/* Detail Drawer */}
			<Drawer open={!!detail} onClose={()=> setDetail(null)} title={detail? detail.name+' '+detail.version: ''}>
				{detail && (
					<div className="space-y-6 text-xs">
						<div className="grid grid-cols-2 gap-4">
							<div><div className="text-gray-500">Type</div><div className="font-medium capitalize">{detail.type}</div></div>
							<div><div className="text-gray-500">Uploaded By</div><div className="font-medium">{detail.uploadedBy}</div></div>
							<div><div className="text-gray-500">Created</div><div className="font-medium">{relative(detail.createdAt)}</div></div>
							<div><div className="text-gray-500">Deployments</div><div className="font-medium">{detail.deployedTenants.length}</div></div>
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div className="p-2 rounded border bg-white text-center"><div className="text-[10px] text-gray-500 uppercase tracking-wide">Accuracy</div><div className="font-semibold text-sm tabular-nums">{detail.accuracy.toFixed(2)}%</div></div>
							<div className="p-2 rounded border bg-white text-center"><div className="text-[10px] text-gray-500 uppercase tracking-wide">Emb/sec</div><div className="font-semibold text-sm tabular-nums">{detail.embeddingsPerSec}</div></div>
							<div className="p-2 rounded border bg-white text-center"><div className="text-[10px] text-gray-500 uppercase tracking-wide">Latency</div><div className="font-semibold text-sm tabular-nums">{detail.latencyMs}ms</div></div>
						</div>
						<div>
							<h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-2">Deployed Tenants</h4>
							<div className="flex flex-wrap gap-2">
								{detail.deployedTenants.length? detail.deployedTenants.map(t => <span key={t} className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px]">{t}</span>): <span className="text-gray-500 text-[11px]">None</span>}
							</div>
						</div>
						<div className="flex flex-wrap gap-2 pt-2">
							<button onClick={()=>openDeploy(detail)} className="px-3 py-1.5 rounded border border-gray-300 text-[11px] hover:bg-orange-50 flex items-center gap-1"><Rocket size={14}/> Deploy</button>
							<button onClick={()=>rollbackModel(detail)} className="px-3 py-1.5 rounded border border-gray-300 text-[11px] hover:bg-orange-50 flex items-center gap-1"><RotateCcw size={14}/> Rollback</button>
							<button onClick={()=>setDeleting(detail)} className="px-3 py-1.5 rounded border border-red-300 text-[11px] hover:bg-red-50 flex items-center gap-1 text-red-600"><Trash2 size={14}/> Delete</button>
						</div>
					</div>
				)}
			</Drawer>
		</div>
	);
};

export default Models;

/* Integration:
import Models from './Models/Models';
// Sidebar already has models tab; render: { activeTab==='models' && <Models /> }
*/
