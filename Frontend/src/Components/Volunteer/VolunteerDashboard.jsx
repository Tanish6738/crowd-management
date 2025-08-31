import React, { useEffect, useState } from 'react';
import { ClipboardList, Bell, Search, User, MapPin, Wifi, WifiOff } from 'lucide-react';
import Tasks from './Tasks/Tasks';
import Alerts from './Alerts/Alerts';
import LostAndFound from './LostAndFound/LostAndFound';
import Profile from './Profile/Profile';

// Mobile-first volunteer dashboard container with bottom navigation
const VolunteerDashboard = () => {
  // In real app derive from auth context
  const volunteer = { id: 'vol123', name: 'Aditi Sharma', zone: 'Zone 7' };
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
    <div className="min-h-dvh flex flex-col lg:flex-row bg-gray-50 lg:max-w-7xl lg:mx-auto lg:border-x lg:border-gray-200" aria-label="Volunteer dashboard">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 border-r border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-800">Volunteer Panel</h1>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium"><MapPin size={12}/> {volunteer.zone}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${online? 'bg-green-100 text-green-700':'bg-gray-200 text-gray-600'}`}>{online? 'Online':'Offline'}</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 text-sm">
          <ul className="space-y-0.5 px-2">
            {tabs.map(t => { const Icon=t.icon; const active = tab===t.key; return (
              <li key={t.key}>
                <button onClick={()=>setTab(t.key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${active? 'bg-orange-500 text-white shadow-sm':'text-gray-600 hover:bg-orange-50 hover:text-orange-600'}`}> <Icon size={18} strokeWidth={active?2.2:1.8}/> <span className="flex-1 truncate text-[13px] font-medium">{t.label}</span></button>
              </li>
            ); })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={toggleOnline}
            disabled={updatingStatus}
            className={`w-full h-11 rounded-md border flex items-center justify-center gap-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${online? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100':'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          >
            {online? <Wifi size={16}/> : <WifiOff size={16}/>}
            <span>{online? 'Go Offline':'Go Online'}</span>
          </button>
        </div>
      </aside>

      {/* Right side content */}
      <div className="flex-1 flex flex-col min-h-dvh">
      {/* Header */}
      <header className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3 lg:hidden">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-800 truncate">Hi, {volunteer.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-600">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium"><MapPin size={12}/> {volunteer.zone}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${online? 'bg-green-100 text-green-700':'bg-gray-200 text-gray-600'}`}>{online? 'Online':'Offline'}</span>
          </div>
        </div>
        <button
          onClick={toggleOnline}
            disabled={updatingStatus}
          className={`h-10 w-10 rounded-full flex items-center justify-center border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${online? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100':'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          aria-pressed={online}
          aria-label={online? 'Go offline':'Go online'}
        >
          {online? <Wifi size={18}/> : <WifiOff size={18}/>}
        </button>
      </header>

      {/* Main Content */}
  <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3" id="volunteer-main">
        {content}
      </main>

      {/* Bottom Navigation */}
  <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 shadow-sm flex lg:hidden" role="tablist" aria-label="Volunteer navigation">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={()=>setTab(t.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active? 'text-orange-600':'text-gray-500'} hover:text-orange-600`}
            >
              <Icon size={20} strokeWidth={active?2.2:1.8} />
              <span>{t.label}</span>
              <span aria-hidden="true" className={`h-0.5 w-8 rounded-full mt-0.5 transition-colors ${active? 'bg-orange-500':'bg-transparent'}`}/>
            </button>
          );
        })}
      </nav>
      </div>
    </div>
  );
};

export default VolunteerDashboard;