import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ClipboardList, Bell, Search, User, MapPin, Wifi, WifiOff } from 'lucide-react';
import Tasks from './Tasks/Tasks';
import Alerts from './Alerts/Alerts';
import LostAndFound from './LostAndFound/LostAndFound';
import Profile from './Profile/Profile';

// Mobile-first volunteer dashboard container with bottom navigation
const VolunteerDashboard = () => {
  const { user, isLoaded } = useUser();
  // Derive volunteer from Clerk user (fallback values while loading)
  const volunteer = isLoaded && user ? {
    id: user.id,
    name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Volunteer',
    zone: user.publicMetadata?.zone || 'Unassigned'
  } : { id: 'loading', name: 'Loading…', zone: '—' };
  const [online, setOnline] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [tab, setTab] = useState('tasks');

  // Simulate API status update
  const toggleOnline = async () => {
    setUpdatingStatus(true);
    try {
      // await fetch(`/api/v1/volunteers/${volunteer.id}/status`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ online: !online })});
      await new Promise(r=>setTimeout(r, 500));
      setOnline(o=>!o);
    } finally { setUpdatingStatus(false); }
  };

  const tabs = [
    { key:'tasks', label:'Tasks', icon: ClipboardList },
    { key:'alerts', label:'Alerts', icon: Bell },
    { key:'lost', label:'Lost & Found', icon: Search },
    { key:'profile', label:'Profile', icon: User },
  ];

  const content = {
    tasks: <Tasks volunteerId={volunteer.id} />,
    alerts: <Alerts volunteerId={volunteer.id} />,
    lost: <LostAndFound volunteerId={volunteer.id} />,
    profile: <Profile volunteer={volunteer} online={online} />
  }[tab];

  return (
  <div className="min-h-dvh flex flex-col lg:flex-row mk-gradient-bg lg:max-w-7xl lg:mx-auto lg-border-x mk-border" aria-label="Volunteer dashboard">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 backdrop-blur-md mk-surface-alt mk-border-r">
        <div className="px-5 py-4 border-b mk-border">
          <h1 className="text-sm font-semibold mk-text-primary">Volunteer Panel</h1>
          <div className="mt-2 flex items-center gap-1 text-[11px] mk-text-muted">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/> {volunteer.zone}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${online? 'bg-green-500/15 text-green-300':'mk-surface-alt mk-text-muted'}`}>{online? 'Online':'Offline'}</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 text-sm">
          <ul className="space-y-0.5 px-2">
            {tabs.map(t => { const Icon=t.icon; const active = tab===t.key; return (
              <li key={t.key}>
                <button
                  onClick={()=>setTab(t.key)}
                  className={`group w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 border border-transparent ${active? 'bg-gradient-to-r from-[var(--mk-accent)] to-[var(--mk-accent-strong)] text-[#081321] font-semibold shadow-md shadow-[var(--mk-accent)]/20':'mk-text-muted hover:mk-text-primary mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}
                  aria-current={active? 'page':undefined}
                >
                  <Icon size={18} strokeWidth={active?2.2:1.8} className={active? '' : 'text-white/60 group-hover:text-white'} />
                  <span className="flex-1 truncate text-[13px] font-medium">{t.label}</span>
                </button>
              </li>
            ); })}
          </ul>
        </nav>
        <div className="p-4 border-t mk-border">
          <button
            onClick={toggleOnline}
            disabled={updatingStatus}
            className={`w-full h-11 rounded-md border flex items-center justify-center gap-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${online? 'bg-green-500/15 border-green-500/30 text-green-300 hover:bg-green-500/25':'mk-surface-alt mk-border mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10'} disabled:opacity-50`}
          >
            {online? <Wifi size={16}/> : <WifiOff size={16}/>}
            <span>{online? 'Go Offline':'Go Online'}</span>
          </button>
        </div>
      </aside>

      {/* Right side content */}
      <div className="flex-1 flex flex-col min-h-dvh">
      {/* Header */}
  <header className="px-4 py-3 mk-surface-alt backdrop-blur border-b mk-border flex items-center gap-3 lg:hidden">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold mk-text-primary truncate">Hi, {isLoaded? volunteer.name.split(' ')[0] : '—'}</h1>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] mk-text-muted">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/> {volunteer.zone}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${online? 'bg-green-500/15 text-green-300':'mk-surface-alt mk-text-muted'}`}>{online? 'Online':'Offline'}</span>
          </div>
        </div>
        <button
          onClick={toggleOnline}
          disabled={updatingStatus}
          className={`h-10 w-10 rounded-full flex items-center justify-center border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${online? 'bg-green-500/15 border-green-500/30 text-green-300 hover:bg-green-500/25':'mk-surface-alt mk-border mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10'} disabled:opacity-50`}
          aria-pressed={online}
          aria-label={online? 'Go offline':'Go online'}
        >
          {online? <Wifi size={18}/> : <WifiOff size={18}/>}
        </button>
      </header>

      {/* Main Content */}
  <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3 mk-text-primary" id="volunteer-main">
        {content}
      </main>

      {/* Bottom Navigation */}
  <nav className="fixed bottom-0 inset-x-0 z-20 mk-surface-alt backdrop-blur border-t mk-border shadow-lg shadow-black/40 flex lg:hidden" role="tablist" aria-label="Volunteer navigation">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={()=>setTab(t.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 transition-colors ${active? 'mk-accent':'mk-text-fainter hover:mk-accent'}`}
            >
              <Icon size={20} strokeWidth={active?2.2:1.8} />
              <span>{t.label}</span>
              <span aria-hidden="true" className={`h-0.5 w-8 rounded-full mt-0.5 transition-all ${active? 'bg-[var(--mk-accent)] scale-100':'bg-transparent scale-75'}`}/>
            </button>
          );
        })}
      </nav>
      </div>
    </div>
  );
};

export default VolunteerDashboard;