import React, { useState } from 'react';
import { MapPin, Clock, LogOut, Shield, Mail, Phone, Lock, Wifi, WifiOff } from 'lucide-react';

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
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${checked? 'bg-green-500 border-green-500':'bg-gray-300 border-gray-300'} disabled:opacity-50`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked? 'translate-x-[22px]':'translate-x-[2px]'}`}/>
  </button>
);

const Profile = ({ volunteer:initialVolunteer, online:initialOnline, onStatusChange }) => {
  // If consumer does not manage state, fall back to local
  const [internal, setInternal] = useState(initialVolunteer || {
    id:'vol123',
    name:'Aditi Sharma',
    email:'aditi@example.com',
    phone:'+91 98989 11111',
    assignedZones:['Zone 7','Zone 5'],
    status: (initialVolunteer?.status) || (initialOnline? 'online':'offline'),
    stats:{ tasksCompleted:182, avgResponseTimeMins:14, alertsResponded:67 }
  });
  const v = initialVolunteer ? {
    // merge defaults for missing keys
    assignedZones: initialVolunteer.assignedZones || (initialVolunteer.zone? [initialVolunteer.zone]: []),
    stats: { tasksCompleted:0, avgResponseTimeMins:0, alertsResponded:0, ...(initialVolunteer.stats||{}) },
    status: initialVolunteer.status || (initialOnline? 'online':'offline'),
    ...initialVolunteer
  } : internal;
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (next) => {
    setUpdating(true);
    try {
      // await fetch(`/api/v1/volunteers/${v.id}/status`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: next ? 'online':'offline' })});
      await new Promise(r=>setTimeout(r, 600));
      if(!initialVolunteer) setInternal(cur => ({ ...cur, status: next? 'online':'offline' }));
      onStatusChange?.(next? 'online':'offline');
    } finally { setUpdating(false); }
  };

  const statsBase = v.stats || { tasksCompleted:0, avgResponseTimeMins:0, alertsResponded:0 };
  const stats = [
    { label:'Tasks Completed', value:statsBase.tasksCompleted, color:'text-green-600' },
    { label:'Avg Resolution Time (m)', value:statsBase.avgResponseTimeMins, color:'text-orange-600' },
    { label:'Alerts Responded', value:statsBase.alertsResponded, color:'text-blue-600' },
  ];

  return (
    <div className="w-full" aria-label="Volunteer profile">
      <div className="flex flex-col lg:grid lg:grid-cols-5 lg:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6 mb-6 lg:mb-0">
          {/* Profile Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-semibold text-xl select-none">
                  {v.name.split(' ').map(p=>p[0]).join('').slice(0,2)}
                </div>
                <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] ${v.status==='online'? 'bg-green-500':'bg-gray-400'}`}>{v.status==='online'? <Wifi size={12}/> : <WifiOff size={12}/>}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h2 className="text-lg font-semibold text-gray-800 truncate flex items-center gap-2">{v.name} <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Volunteer</span></h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(v.assignedZones||[]).map(z => (
                    <span key={z} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-medium"><MapPin size={12}/>{z}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-gray-600">Status: <span className={`font-medium ${v.status==='online'? 'text-green-600':'text-gray-600'}`}>{v.status}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-gray-600">{v.status==='online'? 'Online':'Offline'}</span>
                <Switch checked={v.status==='online'} disabled={updating} onChange={val=>updateStatus(val)} label="Toggle online status" />
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-5">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Shield size={16} className="text-orange-500"/> Account & Settings</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <Mail size={14} className="text-gray-400"/>
                <div className="flex-1">
                  <div className="font-medium text-gray-700">Email</div>
                  <div className="text-gray-600 break-all">{v.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-gray-400"/>
                <div className="flex-1">
                  <div className="font-medium text-gray-700">Phone</div>
                  <div className="text-gray-600">{v.phone}</div>
                </div>
              </div>
              <button className="w-full h-10 rounded-md border border-gray-300 hover:bg-gray-50 text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500"><Lock size={14}/> Change Password</button>
            </div>
            <button className="w-full h-11 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500"><LogOut size={16}/> Logout</button>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Performance Stats */}
            <div className="grid sm:grid-cols-3 gap-3">
              {stats.map(s => (
                <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col gap-2">
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s.label}</div>
                  <div className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Recent Activity</h3>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 mt-1 rounded-full bg-green-500"/> Completed task "Water distribution" 25m ago</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 mt-1 rounded-full bg-blue-500"/> Responded to alert in Zone 5 40m ago</li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 mt-1 rounded-full bg-gray-400"/> Went online 2h ago</li>
              </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
