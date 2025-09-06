import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createLostReport } from '../../../Services/api'; // now a stub that throws
import { UploadCloud, Loader2, XCircle, CheckCircle2, Info, MapPin } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

/**
 * ReportLost Component
 * Mirrors the Lost Person upload portion of the legacy `frontend.html`.
 * Uses the unified helper `createLostReport` which POSTs to `/upload_lost` (and
 * gracefully falls back if the backend exposes an older alternate route). Only
 * backend-supported fields are sent: description, where_lost (location), optional
 * name / age / gender / user_id and image files (`files`). Previously a local `type`
 * field (person | item) was included but the current backend doesn't accept it, so
 * it has been removed to avoid confusion.
 */
const ReportLost = () => {
  const [reporterId, setReporterId] = useState(''); // will hold reporter email
  const { user, isLoaded } = useUser();

  // Populate reporter email from Clerk once available
  useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress || '';
      setReporterId(email);
    }
  }, [isLoaded, user]);
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState([]); // File[] limit 3
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type:'success'|'error', message:string, data?:any }
  const inputRef = useRef(null);

  const reset = () => {
    // preserve reporterId (email) after submit so user doesn't lose context
    setDescription('');
    setName('');
    setGender('');
    setAge('');
    setLocation('');
    setPhotos([]);
  };

  const onFiles = useCallback((fileList) => {
    if (!fileList) return;
    const arr = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    setPhotos(prev => [...prev, ...arr].slice(0,3));
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (['dragenter','dragover'].includes(e.type)) setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    onFiles(e.dataTransfer.files);
  };

  const removePhoto = (i) => setPhotos(p => p.filter((_,idx)=>idx!==i));

  // Submission is disabled because backend lacks a documented endpoint.
  const canSubmit = false;

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setLocation(`Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setResult({ type: 'error', message: 'Submitting lost reports is currently disabled: no API endpoint available.' });
  };

  return (
    <div className="space-y-6" aria-label="Report Lost Person">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold mk-text-primary tracking-wide">Report Lost Person (Unavailable)</h2>
        <p className="text-xs mk-text-faint">The backend API specification provided does not currently define an endpoint for creating lost person reports. This form is read-only until the backend exposes a supported route. You can still enter details for reference.</p>
      </div>
      <form onSubmit={submit} className="space-y-5 opacity-80" onDragEnter={handleDrag}>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Reporter Email</label>
            <input value={reporterId || (isLoaded ? '' : 'Loading...')} disabled readOnly className="h-9 px-3 text-xs rounded-md mk-border mk-surface-alt bg-gray-50 dark:bg-white/5 text-gray-500 w-full" />
          </div>
          {/* Removed deprecated Type selector (not supported by backend) */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="h-9 px-3 text-xs rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60 w-full" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Gender</label>
            <select value={gender} onChange={e=>setGender(e.target.value)} className="h-9 px-3 text-xs rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60 w-full">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Age</label>
            <input type="number" min={0} value={age} onChange={e=>setAge(e.target.value)} placeholder="Age" className="h-9 px-3 text-xs rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60 w-full" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Last Known Location *</label>
            <div className="flex gap-2">
              <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Zone 3 near gate" className="h-9 flex-1 px-3 text-xs rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60 w-full" required />
              <button type="button" onClick={detectLocation} className="h-9 px-3 text-[10px] rounded-md mk-border mk-surface-alt hover:mk-surface flex items-center gap-1"><MapPin size={14}/>Auto</button>
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Description *</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Clothing, distinguishing features, context... (min 10 chars)" rows={4} className="w-full resize-y px-3 py-2 text-xs rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" required />
            {description && description.trim().length < 10 && <p className="text-[10px] text-amber-500">Description must be at least 10 characters.</p>}
          </div>
        </div>
        <div
          className={`relative border-2 border-dashed rounded-md p-6 text-center text-xs transition cursor-pointer ${dragActive ? 'border-orange-400 bg-orange-400/5' : 'mk-border mk-surface-alt hover:mk-surface'}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload photos"
          onClick={()=>inputRef.current?.click()}
          onKeyDown={(e)=>{ if(e.key==='Enter') inputRef.current?.click(); }}
        >
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>onFiles(e.target.files)} />
          <UploadCloud className="mx-auto mb-2 opacity-60" size={28} />
          <p className="mk-text-muted">Drag & drop photos here, or click to browse (1-3 images required)</p>
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {photos.map((f,i)=>(
                <div key={i} className="relative group">
                  <img src={URL.createObjectURL(f)} alt={`preview-${i}`} className="h-24 w-full object-cover rounded" />
                  <button type="button" aria-label="Remove photo" onClick={(e)=>{e.stopPropagation(); removePhoto(i);}} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition">
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button type="submit" disabled className="h-10 px-4 rounded-md text-xs font-semibold inline-flex items-center gap-2 mk-focusable bg-gradient-to-r from-gray-400 to-gray-500 text-white opacity-60 cursor-not-allowed">
            <span>Submission Disabled</span>
          </button>
          <button type="button" onClick={reset} className="h-10 px-4 rounded-md text-xs font-medium mk-surface-alt hover:mk-surface mk-border">Reset</button>
          <span className="text-[10px] text-amber-500 flex items-center gap-1">⚠ Lost report creation endpoint missing in API; awaiting backend support.</span>
        </div>
      </form>
      {result && (
        <div className={`rounded-md border p-4 text-xs space-y-2 ${result.type==='success'? 'border-green-500/30 bg-green-500/10 mk-text-primary':'border-red-500/30 bg-red-500/10 mk-text-primary'}`}>
          <div className="flex items-center gap-2 font-medium">
            {result.type==='success'? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{result.message}</span>
          </div>
          {result.type==='success' && result.data && (
            <pre className="whitespace-pre-wrap mk-text-faint max-h-60 overflow-auto bg-black/5 dark:bg-white/5 p-2 rounded">{JSON.stringify(result.data, null, 2)}</pre>
          )}
        </div>
      )}
      <div className="text-[11px] mk-text-fainter inline-flex items-start gap-2 bg-black/5 dark:bg-white/5 rounded p-3">
        <Info size={14} className="mt-0.5" />
        <span>Photos are required so the system can later attempt matches against found person uploads. Only anonymized embeddings should be stored server-side in production.</span>
      </div>
    </div>
  );
};

export default ReportLost;