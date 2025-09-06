import React, { useCallback, useRef, useState } from 'react';
import { uploadFoundPerson } from '../../../Services/api';
import { UploadCloud, Loader2, XCircle, CheckCircle2, Info, Users } from 'lucide-react';

/**
 * ReportFound Component
 * Implements the found person upload logic (/upload_found) with duplicate + match feedback display.
 */
const ReportFound = ({ userId = 'demo_user_123' }) => {
  const [form, setForm] = useState({
    name: '',
    gender: '',
    age: '',
    where_found: '',
    your_name: '',
    organization: '',
    designation: '',
    mobile_no: '',
    email_id: ''
  });
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type, message, data }
  const inputRef = useRef(null);

  const update = (k,v)=> setForm(f=>({ ...f, [k]: v }));

  const reset = () => {
    setForm({ name:'', gender:'', age:'', where_found:'', your_name:'', organization:'', designation:'', mobile_no:'', email_id:'' });
    setFile(null);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if(['dragenter','dragover'].includes(e.type)) setDragActive(true);
    else if(e.type==='dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if(e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const canSubmit = file && form.name.trim() && form.gender && form.age && form.where_found.trim() && form.your_name.trim() && form.organization.trim() && form.designation.trim() && form.mobile_no.trim() && form.email_id.trim() && !submitting;

  const submit = async (e) => {
    e.preventDefault();
    if(!canSubmit) return;
    setSubmitting(true); setResult(null);
    try {
      const payload = { ...form, age: Number(form.age), user_id: userId, file };
      const data = await uploadFoundPerson(payload);
      setResult({ type:'success', message:'Found person uploaded successfully.', data });
      reset();
    } catch(err) {
      setResult({ type:'error', message: err.message || 'Failed to upload found person.' });
    } finally { setSubmitting(false); }
  };

  const matchedLost = result?.data?.matched_lost || [];
  const duplicateInfo = result?.data?.duplicate_removal;

  return (
    <div className="space-y-6" aria-label="Report Found Person">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold mk-text-primary tracking-wide">Report Found Person</h2>
        <p className="text-xs mk-text-faint">Provide details to help identify and match this person to existing lost reports.</p>
      </div>
      <form onSubmit={submit} className="space-y-5" onDragEnter={handleDrag}>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Person Name *</label>
            <input value={form.name} onChange={e=>update('name', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" placeholder="Unknown if not provided" required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Gender *</label>
            <select value={form.gender} onChange={e=>update('gender', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" required>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Age *</label>
            <input type="number" min={0} value={form.age} onChange={e=>update('age', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" required />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] font-medium mk-text-muted">Where Found *</label>
            <input value={form.where_found} onChange={e=>update('where_found', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" placeholder="Location or context" required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Reporter Name *</label>
            <input value={form.your_name} onChange={e=>update('your_name', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Organization *</label>
            <input value={form.organization} onChange={e=>update('organization', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Designation *</label>
            <input value={form.designation} onChange={e=>update('designation', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium mk-text-muted">Mobile No *</label>
            <input value={form.mobile_no} onChange={e=>update('mobile_no', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" placeholder="+1 555 ..." required />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] font-medium mk-text-muted">Email *</label>
            <input type="email" value={form.email_id} onChange={e=>update('email_id', e.target.value)} className="h-9 w-full px-3 rounded-md mk-border mk-surface-alt focus:outline-none focus:ring-2 focus:ring-orange-400/60" placeholder="name@example.com" required />
          </div>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-md p-6 text-center text-xs transition cursor-pointer ${dragActive ? 'border-orange-400 bg-orange-400/5':'mk-border mk-surface-alt hover:mk-surface'}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload face image"
          onClick={()=>inputRef.current?.click()}
          onKeyDown={(e)=>{ if(e.key==='Enter') inputRef.current?.click(); }}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=> setFile(e.target.files?.[0] || null)} />
          <UploadCloud size={28} className="mx-auto mb-2 opacity-60" />
            {!file && <p className="mk-text-muted">Drag & drop a face image here, or click to browse (required)</p>}
            {file && (
              <div className="flex flex-col items-center gap-2">
                <img src={URL.createObjectURL(file)} alt="preview" className="h-32 w-32 object-cover rounded" />
                <button type="button" onClick={(e)=>{ e.stopPropagation(); setFile(null); }} className="text-[10px] px-2 py-1 rounded mk-status-danger hover:brightness-110 inline-flex items-center gap-1"><XCircle size={12}/>Remove</button>
              </div>
            )}
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={!canSubmit} className="h-10 px-4 rounded-md text-xs font-semibold inline-flex items-center gap-2 mk-focusable bg-gradient-to-r from-orange-400 to-pink-500 text-white disabled:opacity-40 disabled:cursor-not-allowed">
            {submitting && <Loader2 size={14} className="animate-spin" />}<span>Upload Found Person</span>
          </button>
          <button type="button" onClick={reset} className="h-10 px-4 rounded-md text-xs font-medium mk-surface-alt hover:mk-surface mk-border">Reset</button>
        </div>
      </form>
      {result && (
        <div className={`rounded-md border p-4 text-xs space-y-3 ${result.type==='success'? 'border-green-500/30 bg-green-500/10':'border-red-500/30 bg-red-500/10'}`}>          <div className="flex items-center gap-2 font-medium mk-text-primary">
            {result.type==='success'? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
            <span>{result.message}</span>
          </div>
          {result.type==='success' && (
            <div className="space-y-4">
              {matchedLost.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1"><Users size={12}/> Potential Matches <span className="mk-badge mk-status-warn">{matchedLost.length}</span></h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {matchedLost.map(m => (
                      <div key={m.face_id} className="p-2 rounded mk-surface-alt mk-border text-[11px] space-y-1">
                        <div className="font-mono mk-text-fainter text-[10px]">{m.face_id}</div>
                        <div className="font-medium mk-text-primary">{m.name || 'Unnamed'}</div>
                        <div className="mk-text-faint">{m.gender}, {m.age}</div>
                        <div className="text-[10px] mk-text-fainter capitalize">Status: {m.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {duplicateInfo && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1"><Info size={12}/> Duplicate Cleanup</h4>
                  <div className="text-[11px] mk-text-faint">Duplicates Found: {duplicateInfo.duplicates_found} | Removed: {duplicateInfo.records_removed}</div>
                  {duplicateInfo.removed_records?.length > 0 && (
                    <details className="text-[11px] mk-text-muted">
                      <summary className="cursor-pointer mk-text-primary">Removed Records ({duplicateInfo.removed_records.length})</summary>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        {duplicateInfo.removed_records.map(r => (
                          <li key={r.face_id} className="font-mono mk-text-fainter">
                            {r.face_id} <span className="mk-text-faint">({r.name}) – {r.similarity_percentage?.toFixed?.(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <details className="text-[11px] mk-text-fainter">
                <summary className="cursor-pointer mk-text-muted">Raw Response</summary>
                <pre className="whitespace-pre-wrap bg-black/5 dark:bg-white/5 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result.data, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}
      <div className="text-[11px] mk-text-fainter inline-flex items-start gap-2 bg-black/5 dark:bg-white/5 rounded p-3">
        <Info size={14} className="mt-0.5" />
        <span>On upload the system generates a face embedding, attempts immediate match against lost records, and performs duplicate cleanup in the found collection.</span>
      </div>
    </div>
  );
};

export default ReportFound;