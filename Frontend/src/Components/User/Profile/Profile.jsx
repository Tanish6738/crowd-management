import React from 'react';
import { Save, LogOut } from 'lucide-react';

/**
 * Dark themed User Profile
 */
const Profile = ({ profile, onChange, onSave, saving, onLogout }) => {
  const initials = (profile?.name || '?').split(' ').map(p=>p[0]).join('').slice(0,2);
  return (
    <div className="w-full max-w-2xl space-y-6 text-white/90" aria-label="User profile settings">
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-xl font-semibold text-white select-none shadow-inner">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">{profile.name || 'Unnamed User'}</h2>
          <div className="text-xs text-white/60 break-all">{profile.email}</div>
        </div>
        <button type="button" onClick={onLogout} className="h-10 px-4 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><LogOut size={14}/> Logout</button>
      </div>
      <form onSubmit={(e)=>{ e.preventDefault(); onSave?.(); }} className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-5" aria-label="Edit profile form">
        <div className="grid sm:grid-cols-2 gap-4 text-[11px]">
          <label className="flex flex-col gap-1 font-medium text-white/60">
            <span>Name</span>
            <input value={profile.name} onChange={(e)=>onChange?.('name', e.target.value)} placeholder="Full name" className="h-9 rounded-md bg-white/5 border border-white/10 px-2 text-[11px] text-white/80 placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60" />
          </label>
          <label className="flex flex-col gap-1 font-medium text-white/60">
            <span>Email</span>
            <input value={profile.email} type="email" onChange={(e)=>onChange?.('email', e.target.value)} placeholder="Email address" className="h-9 rounded-md bg-white/5 border border-white/10 px-2 text-[11px] text-white/80 placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60" />
          </label>
          <label className="sm:col-span-2 flex flex-col gap-1 font-medium text-white/60">
            <span>Bio</span>
            <textarea value={profile.bio || ''} onChange={(e)=>onChange?.('bio', e.target.value)} rows={3} placeholder="Short bio or notes" className="rounded-md bg-white/5 border border-white/10 px-2 py-2 text-[11px] leading-relaxed resize-none text-white/80 placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60" />
          </label>
        </div>
        <div className="pt-2 flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="h-9 px-4 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-[11px] font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"><Save size={14}/> {saving? 'Saving...':'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
