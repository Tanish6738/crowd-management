import React, { useRef, useState } from 'react';
import { Camera, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { uploadFoundPerson } from '../../../../Services/api';
import { useUser } from '@clerk/clerk-react';
import { useToast } from '../../../General/Toast.jsx';

/** Form aligned with backend upload_found endpoint.
 * Required fields (per docs / server validation likely): file plus any provided metadata.
 * We'll treat name, gender, age, where_found, your_name, organization, designation, user_id, mobile_no, email_id as form fields.
 */
const FoundReport = ({ volunteerId: volunteerIdProp, onCreated }) => {
  const { user } = useUser();
  const authId = user?.id;
  const volunteerId = volunteerIdProp || authId || 'anonymous';
  const { push } = useToast();
  const [photo, setPhoto] = useState(null); // single File
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [whereFound, setWhereFound] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const detectLocation = () => {
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setWhereFound(`Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
    }, ()=>{}, { maximumAge:60000, timeout:5000 });
  };

  const [touched, setTouched] = useState({});
  const markTouched = k => setTouched(t => ({ ...t, [k]: true }));
  const fieldError = (k) => {
    const v = { name, gender, age, whereFound, reporterName, mobile, email }[k];
    if(!touched[k]) return '';
    if(!v) return 'Required';
    if(k==='email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Invalid email';
    if(k==='age' && v && (+v<0 || +v>120)) return 'Invalid age';
    if(k==='mobile' && v && v.replace(/\D/g,'').length<7) return 'Too short';
    return '';
  };
  const canSubmit = photo && reporterName.trim() && whereFound.trim() && gender && age && name.trim() && mobile.trim() && email.trim() && !fieldError('email') && !fieldError('age');

  const submit = async () => {
    if(!canSubmit) return;
    setSubmitting(true); setError(null); setSuccess(false);
    try {
      const payload = {
        name: name.trim(),
        gender,
        age: age.trim(),
        where_found: whereFound.trim(),
        your_name: reporterName.trim(),
        organization: organization.trim() || undefined,
        designation: designation.trim() || undefined,
        user_id: volunteerId,
        mobile_no: mobile.trim(),
        email_id: email.trim(),
        file: photo
      };
      const res = await uploadFoundPerson(payload);
      const record = {
        id: res?.found_id || res?.face_id || 'found_'+Date.now(),
        type: 'person',
        description: `Found: ${name.trim()} (${age||'?'} yrs)`,
        photoUrls: [URL.createObjectURL(photo)],
        location: whereFound.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        reporterId: volunteerId
      };
  onCreated && onCreated(record);
  push('Found person submitted.', { type:'success' });
      setSuccess(true);
      setTimeout(()=>{
        setSuccess(false);
        setPhoto(null); setName(''); setGender(''); setAge(''); setWhereFound(''); setReporterName(''); setOrganization(''); setDesignation(''); setMobile(''); setEmail('');
      }, 1500);
    } catch(e){ setError(e?.message || 'Failed to submit.'); } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5 text-xs mk-text-secondary">
      {success && <div className="p-2 rounded-md bg-green-500/10 text-green-300 border border-green-400/40 text-[11px]">Found person submitted.</div>}
      {error && <div className="p-2 rounded-md bg-red-500/10 text-red-300 border border-red-400/40 text-[11px]">{error}</div>}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-[11px] font-medium mk-text-secondary">Person Name *</label>
          <input value={name} onBlur={()=>markTouched('name')} onChange={e=>setName(e.target.value)} placeholder="Full name" className={`w-full h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary ${fieldError('name') && 'border-red-500/60'}`} />
          {fieldError('name') && <p className="text-[10px] text-red-400">{fieldError('name')}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium mk-text-secondary">Age *</label>
          <input type="number" min="0" value={age} onBlur={()=>markTouched('age')} onChange={e=>setAge(e.target.value)} placeholder="Age" className={`w-full h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary ${fieldError('age') && 'border-red-500/60'}`} />
          {fieldError('age') && <p className="text-[10px] text-red-400">{fieldError('age')}</p>}
        </div>
        <div className="space-y-1 col-span-3">
          <label className="text-[11px] font-medium mk-text-secondary">Gender *</label>
          <select value={gender} onBlur={()=>markTouched('gender')} onChange={e=>setGender(e.target.value)} className={`h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 mk-text-primary ${fieldError('gender') && 'border-red-500/60'}`}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {fieldError('gender') && <p className="text-[10px] text-red-400">{fieldError('gender')}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium mk-text-secondary">Your Name *</label>
          <input value={reporterName} onBlur={()=>markTouched('reporterName')} onChange={e=>setReporterName(e.target.value)} placeholder="Reporter name" className={`w-full h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary ${fieldError('reporterName') && 'border-red-500/60'}`} />
          {fieldError('reporterName') && <p className="text-[10px] text-red-400">{fieldError('reporterName')}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium mk-text-secondary">Organization</label>
          <input value={organization} onChange={e=>setOrganization(e.target.value)} placeholder="Org (optional)" className="w-full h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium mk-text-secondary">Designation</label>
          <input value={designation} onChange={e=>setDesignation(e.target.value)} placeholder="Role (optional)" className="w-full h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium mk-text-secondary">Mobile *</label>
          <input value={mobile} onBlur={()=>markTouched('mobile')} onChange={e=>setMobile(e.target.value)} placeholder="Contact number" className={`w-full h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary ${fieldError('mobile') && 'border-red-500/60'}`} />
          {fieldError('mobile') && <p className="text-[10px] text-red-400">{fieldError('mobile')}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-[11px] font-medium mk-text-secondary">Email *</label>
          <input type="email" value={email} onBlur={()=>markTouched('email')} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" className={`w-full h-9 rounded-md mk-border mk-surface-alt px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary ${fieldError('email') && 'border-red-500/60'}`} />
          {fieldError('email') && <p className="text-[10px] text-red-400">{fieldError('email')}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium mk-text-secondary flex items-center gap-1"><MapPin size={12}/> Where Found *</label>
          <button type="button" onClick={detectLocation} className="text-[10px] underline mk-text-accent hover:mk-text-accent-strong">Auto-detect</button>
        </div>
  <input value={whereFound} onBlur={()=>markTouched('whereFound')} onChange={e=>setWhereFound(e.target.value)} placeholder="Zone / coordinates" className={`w-full h-10 rounded-md mk-border mk-surface-alt px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 placeholder:mk-text-fainter mk-text-primary ${fieldError('whereFound') && 'border-red-500/60'}`} />
  {fieldError('whereFound') && <p className="text-[10px] text-red-400">{fieldError('whereFound')}</p>}
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-medium mk-text-secondary">Photo *</label>
        <div className="flex flex-wrap gap-3">
          {photo && (
            <div className="relative h-20 w-20 rounded-md overflow-hidden mk-border mk-surface-alt">
              <img src={URL.createObjectURL(photo)} alt="preview" className="object-cover h-full w-full" />
              <button onClick={()=>setPhoto(null)} className="absolute -top-1 -right-1 bg-red-600/80 hover:bg-red-600 text-white h-5 w-5 rounded-full text-[11px] flex items-center justify-center">✕</button>
            </div>
          )}
          {!photo && (
            <label className="h-20 w-20 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed mk-border mk-text-muted text-[11px] cursor-pointer hover:border-orange-400/60 hover:mk-text-accent">
              <Camera size={18} />
              <span>Add</span>
              <input ref={inputRef} onChange={e=>{ if(e.target.files?.[0]) setPhoto(e.target.files[0]); }} accept="image/*" capture="environment" type="file" hidden />
            </label>
          )}
        </div>
      </div>
      <div className="pt-2 flex justify-end">
        <button disabled={!canSubmit || submitting} onClick={submit} className="h-10 px-5 rounded-md bg-gradient-to-r from-[var(--mk-accent)] to-[var(--mk-accent-strong)] text-[#081321] text-xs font-semibold flex items-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 hover:brightness-110">{submitting && <Loader2 size={14} className="animate-spin"/>} Submit Found</button>
      </div>
      {!canSubmit && (name||whereFound||reporterName||mobile||email||photo) && (
        <div className="text-[10px] flex items-start gap-1 text-amber-400/80"><AlertCircle size={12}/> Fill all required fields ( * ) and add a photo.</div>
      )}
    </div>
  );
};

export default FoundReport;
