import React from 'react';
import { Save, LogOut } from 'lucide-react';

/**
 * Dark themed User Profile
 */
const Profile = ({ profile, onChange, onSave, saving, onLogout }) => {
  const initials = (profile?.name || '?').split(' ').map(p=>p[0]).join('').slice(0,2);
  return (
    <div className="w-full max-w-2xl space-y-6 mk-text-secondary" aria-label="User profile settings">
      <div className="mk-card mk-surface-alt backdrop-blur p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-xl font-semibold text-white select-none shadow-inner">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold mk-text-primary truncate">{profile.name || 'Unnamed User'}</h2>
          <div className="text-xs mk-text-faint break-all">{profile.email}</div>
        </div>
        <button type="button" onClick={onLogout} className="h-10 px-4 rounded-md mk-status-danger hover:brightness-110 text-xs font-medium inline-flex items-center gap-2 mk-focusable"><LogOut size={14}/> Logout</button>
      </div>
      <form onSubmit={(e)=>{ e.preventDefault(); onSave?.(); }} className="mk-card mk-surface-alt backdrop-blur p-5 space-y-5" aria-label="Edit profile form">
        <div className="grid sm:grid-cols-2 gap-4 text-[11px] mk-text-secondary">
          <label className="flex flex-col gap-1 font-medium mk-text-faint">
            <span>Name</span>
            <input value={profile.name} onChange={(e)=>onChange?.('name', e.target.value)} placeholder="Full name" className="h-9 rounded-md mk-subtle px-2 text-[11px] mk-text-primary placeholder:mk-text-fainter focus:outline-none mk-focusable" />
          </label>
          <label className="flex flex-col gap-1 font-medium mk-text-faint">
            <span>Email</span>
            <input value={profile.email} type="email" onChange={(e)=>onChange?.('email', e.target.value)} placeholder="Email address" className="h-9 rounded-md mk-subtle px-2 text-[11px] mk-text-primary placeholder:mk-text-fainter focus:outline-none mk-focusable" />
          </label>
          <label className="sm:col-span-2 flex flex-col gap-1 font-medium mk-text-faint">
            <span>Bio</span>
            <textarea value={profile.bio || ''} onChange={(e)=>onChange?.('bio', e.target.value)} rows={3} placeholder="Short bio or notes" className="rounded-md mk-subtle px-2 py-2 text-[11px] leading-relaxed resize-none mk-text-primary placeholder:mk-text-fainter focus:outline-none mk-focusable" />
          </label>
        </div>
        <div className="pt-2 flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="h-9 px-4 rounded-md mk-badge-accent text-[11px] font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mk-focusable"><Save size={14}/> {saving? 'Saving...':'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
