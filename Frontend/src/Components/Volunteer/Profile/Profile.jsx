import React, { useEffect, useState } from 'react';
import { MapPin, Clock, LogOut, Shield, Mail, Phone, Lock, Wifi, WifiOff } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

/** @typedef {{ id:string; name:string; email:string; phone:string; assignedZones:string[]; status:'online'|'offline'; stats:{ tasksCompleted:number; avgResponseTimeMins:number; alertsResponded:number; } }} VolunteerProfile */

// Accessible toggle component (shadcn/ui style minimal)
const Switch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={()=>!disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${checked? 'bg-green-600/60 border-green-400/40':'bg-white/10 border-white/15'} disabled:opacity-50`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked? 'translate-x-[22px]':'translate-x-[2px]'}`}/>
  </button>
);

const Info = ({ label, value, mono, truncate }) => (
  <div className="flex justify-between gap-4">
    <span className="mk-text-muted">{label}</span>
    <span className={`${mono? 'font-mono text-[10px]':''} ${truncate? 'truncate max-w-[55%] text-right':''} mk-text-primary font-medium`}>{value ?? '—'}</span>
  </div>
);
const Section = ({ title, children }) => (
  <div className="space-y-2">
    <div className="uppercase tracking-wide text-[10px] mk-text-fainter font-semibold">{title}</div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Profile = ({ volunteer:initialVolunteer, online:initialOnline, onStatusChange }) => {
  const { user, isLoaded } = useUser();
  console.log(user);
  const [status, setStatus] = useState(initialOnline? 'online':'offline');
  const [updating, setUpdating] = useState(false);
  
  const formatDate = (d) => {
    try {
      if(!d) return '—';
      const dt = d instanceof Date ? d : new Date(d);
      return dt.toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  };

  // Build object from Clerk user
  const derived = user ? {
    id: user.id,
    name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Volunteer',
    email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || 'unknown@example.com',
    phone: user.primaryPhoneNumber?.phoneNumber || '+000 000 0000',
    assignedZones: initialVolunteer?.assignedZones || [],
    status,
    stats: initialVolunteer?.stats || { tasksCompleted:0, avgResponseTimeMins:0, alertsResponded:0 }
  } : null;

  const fallback = {
    id:'loading',
    name:'Loading User',
    email:'loading@example.com',
    phone:'—',
    assignedZones:[],
    status,
    stats:{ tasksCompleted:0, avgResponseTimeMins:0, alertsResponded:0 }
  };

  const v = initialVolunteer ? { ...initialVolunteer, status } : (derived || fallback);

  useEffect(()=>{ if(isLoaded && user){ /* could hydrate extra stats here */ } }, [isLoaded, user]);

  const updateStatus = async (next) => {
    setUpdating(true);
    try {
      // await fetch(`/api/v1/volunteers/${v.id}/status`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: next ? 'online':'offline' })});
      await new Promise(r=>setTimeout(r, 600));
      setStatus(next? 'online':'offline');
      onStatusChange?.(next? 'online':'offline');
    } finally { setUpdating(false); }
  };

  // Real stats derived from Clerk user instead of dummy volunteer metrics
  const stats = [
    { label:'External Accounts', value: user?.externalAccounts?.length ?? 0, color:'text-blue-600' },
    { label:'Organizations', value: user?.organizationMemberships?.length ?? 0, color:'text-indigo-600' },
    { label:'Web3 Wallets', value: user?.web3Wallets?.length ?? 0, color:'text-purple-600' },
  ];

  const timeAgo = (d) => {
    if(!d) return '—';
    const ts = d instanceof Date ? d.getTime() : new Date(d).getTime();
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    if(mins < 1) return 'just now';
    if(mins < 60) return mins+ 'm ago';
    const hrs = Math.floor(mins/60);
    if(hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs/24);
    if(days < 7) return days + 'd ago';
    const weeks = Math.floor(days/7);
    if(weeks < 4) return weeks + 'w ago';
    const months = Math.floor(days/30);
    if(months < 12) return months + 'mo ago';
    const years = Math.floor(days/365);
    return years + 'y ago';
  };

  return (
  <div className="w-full mk-text-primary" aria-label="Volunteer profile">
      <div className="flex flex-col lg:grid lg:grid-cols-5 lg:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6 mb-6 lg:mb-0">
          {/* Profile Card */}
          <div className="rounded-lg mk-border mk-surface-alt backdrop-blur-sm p-5 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={v.name+" avatar"} className="h-16 w-16 rounded-full object-cover mk-border" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-300 text-[#081321] flex items-center justify-center font-semibold text-xl select-none">
                    {v.name.split(' ').map(p=>p[0]).join('').slice(0,2)}
                  </div>
                )}
                <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#0d1623] flex items-center justify-center text-white text-[10px] ${v.status==='online'? 'bg-green-500':'bg-white/30'}`}>{v.status==='online'? <Wifi size={12}/> : <WifiOff size={12}/>}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h2 className="text-lg font-semibold mk-text-primary truncate flex items-center gap-2">{v.name} <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Volunteer</span></h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(v.assignedZones||[]).map(z => (
                    <span key={z} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 text-[11px] font-medium"><MapPin size={12}/>{z}</span>
                  ))}
                  {!isLoaded && <span className="h-5 w-16 rounded bg-white/10 animate-pulse" />}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-white/60">Status: <span className={`font-medium ${v.status==='online'? 'text-green-300':'text-white/60'}`}>{v.status}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-white/60">{v.status==='online'? 'Online':'Offline'}</span>
                <Switch checked={v.status==='online'} disabled={updating || !isLoaded} onChange={val=>updateStatus(val)} label="Toggle online status" />
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Shield size={16} className="text-orange-400"/> Account & Settings</h3>
            <div className="space-y-4 text-xs">
              {/* Primary Contact */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-white/40"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mk-text-primary">Email</div>
                    <div className="mk-text-muted break-all">{!isLoaded? 'Loading…' : v.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-white/40"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mk-text-primary">Phone</div>
                    <div className="mk-text-muted">{!isLoaded? 'Loading…' : (user?.primaryPhoneNumber?.phoneNumber || '—')}</div>
                  </div>
                </div>
              </div>

              {/* Extended Account Info (structured) */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <Section title="Identity">
                  <Info label="Username" value={user?.username} />
                  <Info label="User ID" mono value={user?.id} />
                  <Info label="Created" value={formatDate(user?.createdAt)} />
                  <Info label="Last Sign-In" value={formatDate(user?.lastSignInAt)} />
                </Section>
                <Section title="Security">
                  <Info label="Email Verified" value={user?.primaryEmailAddress?.verification?.status==='verified' ? 'Yes':'No'} />
                  <Info label="Password Enabled" value={user?.passwordEnabled? 'Yes':'No'} />
                  <Info label="2FA (TOTP)" value={(user?.twoFactorEnabled||user?.totpEnabled)? 'Enabled':'Disabled'} />
                  <Info label="Backup Codes" value={user?.backupCodeEnabled? 'Enabled':'Disabled'} />
                  <Info label="Passkeys" value={(user?.passkeys?.length||0)+' registered'} />
                </Section>
                <Section title="Connectivity">
                  <Info label="External Accounts" value={user?.externalAccounts?.length} />
                  <Info label="Organizations" value={user?.organizationMemberships?.length} />
                  <Info label="Web3 Wallets" value={user?.web3Wallets?.length} />
                </Section>
                <Section title="Capabilities">
                  <Info label="Create Org" value={user?.createOrganizationEnabled? 'Allowed':'No'} />
                  <Info label="Delete Self" value={user?.deleteSelfEnabled? 'Allowed':'No'} />
                </Section>
                <Section title="Metadata">
                  <Info label="Primary Email ID" value={user?.primaryEmailAddressId} mono truncate />
                  <Info label="Primary Phone ID" value={user?.primaryPhoneNumberId || '—'} mono truncate />
                  <Info label="Legal Accepted" value={user?.legalAcceptedAt? formatDate(user.legalAcceptedAt):'—'} />
                </Section>
              </div>

              <div className="flex gap-2 pt-1">
                <button className="flex-1 h-10 rounded-md mk-border mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"><Lock size={14}/> Change Password</button>
                <button className="flex-1 h-10 rounded-md mk-border mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">Manage 2FA</button>
              </div>
            </div>
            <button className="w-full h-11 rounded-md bg-red-600/80 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"><LogOut size={16}/> Logout</button>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Performance Stats */}
            <div className="grid sm:grid-cols-3 gap-3">
              {stats.map(s => (
                <div key={s.label} className="rounded-lg mk-border mk-surface-alt p-4 flex flex-col gap-2 backdrop-blur-sm">
                  <div className="text-[11px] font-medium mk-text-fainter uppercase tracking-wide">{s.label}</div>
                  <div className={`text-2xl font-semibold tabular-nums ${s.color.replace('text-','text-')}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Account Timeline (real data) */}
            <div className="rounded-lg mk-border mk-surface-alt backdrop-blur-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold mk-text-primary flex items-center gap-2"><Clock size={16} className="text-orange-400"/> Account Timeline</h3>
              <ul className="space-y-3 text-xs mk-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 mt-1 rounded-full bg-indigo-400"/>
                  <span>Account created {isLoaded? timeAgo(user?.createdAt): '…'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 mt-1 rounded-full bg-green-400"/>
                  <span>Last sign-in {isLoaded? timeAgo(user?.lastSignInAt): '…'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 mt-1 rounded-full bg-orange-400"/>
                  <span>Email {user?.primaryEmailAddress?.verification?.status==='verified' ? 'verified' : 'not verified'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 mt-1 rounded-full bg-purple-400"/>
                  <span>{(user?.twoFactorEnabled||user?.totpEnabled)? 'Two-factor authentication enabled':'Two-factor authentication not enabled'}</span>
                </li>
              </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
