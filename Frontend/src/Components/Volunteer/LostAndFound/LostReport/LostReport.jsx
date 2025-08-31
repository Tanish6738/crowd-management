import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

const LostReport = ({ volunteerId='vol123', onCreated }) => {
  const [type, setType] = useState('person');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState([]); // File[]
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const addPhotos = (files) => {
    const list = Array.from(files||[]).slice(0,3);
    if(!list.length) return;
    setPhotos(p => [...p, ...list].slice(0,3));
  };

  const handlePhotoInput = e => addPhotos(e.target.files);

  const detectLocation = () => {
    if(!navigator.geolocation){ setLocation(''); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setLocation(`Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
    }, ()=>{}, { maximumAge:60000, timeout:5000 });
  };

  const canSubmit = photos.length>0 && description.trim().length>10 && location.trim().length>0;

  const submit = async () => {
    if(!canSubmit) return;
    setSubmitting(true); setError(null);
    try {
      await new Promise(r=>setTimeout(r, 900)); // simulate
      /** @type {LostCase} */
      const record = {
        id:'lr'+Date.now(),
        type, description:description.trim(),
        photoUrls: photos.map(f=>URL.createObjectURL(f)),
        location: location.trim(),
        status:'open', createdAt:new Date().toISOString(), reporterId:volunteerId
      };
      setSuccess(true);
      onCreated && onCreated(record);
      setTimeout(()=>{ setSuccess(false); setType('person'); setDescription(''); setLocation(''); setPhotos([]); }, 1200);
    } catch(e){ setError('Failed to submit report.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5 text-xs">
      {success && <div className="p-2 rounded-md bg-green-50 text-green-700 border border-green-200 text-[11px]">Report submitted.</div>}
      {error && <div className="p-2 rounded-md bg-red-50 text-red-600 border border-red-200 text-[11px]">{error}</div>}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-gray-700">Type</label>
        <select value={type} onChange={e=>setType(e.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none">
          <option value="person">Person</option>
          <option value="item">Item</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-gray-700">Photos <span className="text-gray-400">(max 3)</span></label>
        <div className="flex flex-wrap gap-3">
          {photos.map(f => (
            <div key={f.name} className="relative h-20 w-20 rounded-md overflow-hidden border border-gray-300">
              <img src={URL.createObjectURL(f)} alt="preview" className="object-cover h-full w-full" />
              <button onClick={()=>setPhotos(p=>p.filter(x=>x.name!==f.name))} className="absolute -top-1 -right-1 bg-red-600 text-white h-5 w-5 rounded-full text-[11px] flex items-center justify-center">✕</button>
            </div>
          ))}
          {photos.length<3 && (
            <label className="h-20 w-20 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-gray-300 text-gray-500 text-[11px] cursor-pointer hover:border-orange-400 hover:text-orange-600">
              <Camera size={18} />
              <span>Add</span>
              <input ref={inputRef} onChange={handlePhotoInput} accept="image/*" capture="environment" type="file" multiple hidden />
            </label>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-gray-700">Description</label>
        <textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Describe missing person/item, clothing, distinctive marks, etc." />
        <p className="text-[10px] text-gray-400">At least 10 characters.</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-gray-700">Location / Zone</label>
          <button type="button" onClick={detectLocation} className="text-[10px] underline text-orange-600">Auto-detect</button>
        </div>
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Zone 5 or coordinates" className="w-full h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>
      <div className="pt-2 flex justify-end">
        <button disabled={!canSubmit || submitting} onClick={submit} className="h-10 px-5 rounded-md bg-orange-600 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50">{submitting && <Loader2 size={14} className="animate-spin"/>} Submit Report</button>
      </div>
    </div>
  );
};

export default LostReport;
