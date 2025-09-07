import React, { useState, useMemo } from 'react';
import LayoutShell from '../General/LayoutShell';
import Sidebar from '../General/Sidebar';
import AdminTopBar from './AdminTopBar';
import OccupancyMap from './OccupancyMap';
import Cameras from './Cameras/Cameras';
import LostAndFound from './LostAndFound/LostAndFound';
import CrowdAnalytics from './Crowd/CrowdAnalytics';
import Tasks from './Tasks/Tasks';
import Reports from './Reports/Reports';
import Settings from './Settings/Settings';
import Volunteers from './Volunteers/Volunteers';
import MapEditor from './MapEditor/MapEditor';
// import AlertPanel from './AlertPanel'; // replaced by advanced Alerts component
import Alerts from './Alerts/Alerts';
import CameraStrip from '../General/CameraStrip';
import Modal from '../General/Modal';
import HeatMap from './HeatMap/HeatMap';

// Seed Data ----------------------------------------------------------------
const zonesSeed = [
  { id: 'z1', name: 'Gate A', occupancy: 42, status: 'Normal' },
  { id: 'z2', name: 'Riverbank', occupancy: 78, status: 'Busy' },
  { id: 'z3', name: 'Transit Hub', occupancy: 91, status: 'Critical' },
  { id: 'z4', name: 'North Camp', occupancy: 0, status: 'Closed' },
  { id: 'z5', name: 'Food Court', occupancy: 55, status: 'Normal' },
  { id: 'z6', name: 'Lost & Found', occupancy: 65, status: 'Busy' },
  { id: 'z7', name: 'Medical', occupancy: 23, status: 'Normal' },
  { id: 'z8', name: 'South Gate', occupancy: 74, status: 'Busy' },
  { id: 'z9', name: 'Camp Delta', occupancy: 88, status: 'Critical' },
];
const alertsSeed = [
  { id: 'a1', type: 'Overcrowding', severity: 'High', zone: 'Transit Hub', timeAgo: '2m', status: 'New' },
  { id: 'a2', type: 'Camera Offline', severity: 'Medium', zone: 'North Camp', timeAgo: '5m', status: 'New' },
  { id: 'a3', type: 'SOS Triggered', severity: 'Critical', zone: 'Riverbank', timeAgo: '7m', status: 'New' },
];
const camerasSeed = [
  { id: 'c1', name: 'Cam Gate A', status: 'Online', facesPerMin: 12 },
  { id: 'c2', name: 'Cam River 1', status: 'Online', facesPerMin: 30 },
  { id: 'c3', name: 'Cam Transit 2', status: 'Degraded', facesPerMin: 8 },
  { id: 'c4', name: 'Cam North', status: 'Offline', facesPerMin: 0 },
  { id: 'c5', name: 'Cam Food', status: 'Online', facesPerMin: 18 },
  { id: 'c6', name: 'Cam Medical', status: 'Online', facesPerMin: 6 },
  { id: 'c7', name: 'Cam South', status: 'Online', facesPerMin: 22 },
];

const AdminDashboard = () => {
  // Navigation tabs --------------------------------------------------------
  const navTabs = useMemo(() => [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'map-editor', label: 'Map Editor' },
    { key : 'Heat-Map', label: "Heat-Map"},
    { key: 'cameras', label: 'Cameras' },
    { key: 'lost-found', label: 'Lost & Found' },
    { key: 'crowd-analytics', label: 'Crowd Analytics' },
    { key: 'alerts', label: 'Alerts' },
    { key: 'volunteers', label: 'Volunteers' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
  ], []);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);

  // State ------------------------------------------------------------------
  const [zones] = useState(zonesSeed);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [live, setLive] = useState(true);
  const [search, setSearch] = useState('');
  // Alerts handled inside Alerts component; keep count only
  const [alertCount, setAlertCount] = useState(0);
  const [selectedZone, setSelectedZone] = useState(null);
  const [cameraModal, setCameraModal] = useState(null);
  const [mobileSection, setMobileSection] = useState('map'); // map | alerts | cameras

  // Derived filtered zones -------------------------------------------------
  const displayZones = zoneFilter === 'all' ? zones : zones.filter(z => z.id === zoneFilter);

  // Handlers ---------------------------------------------------------------
  // Right panel overlay state for < lg breakpoints
  const [alertsOverlayOpen, setAlertsOverlayOpen] = useState(false);

  // Mobile simplified view -------------------------------------------------
  const renderMobileTabs = () => (
    <div className="sm:hidden mb-3 -mx-1">
      <div className="flex gap-2 overflow-x-auto px-1">
        {['map','alerts','cameras'].map(key => (
          <button
            key={key}
            onClick={() => setMobileSection(key)}
            className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition ${mobileSection===key ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'mk-surface-alt mk-border mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10'}`}
          >
            {key.charAt(0).toUpperCase()+key.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  const mapEl = (
    <OccupancyMap zones={displayZones} selectedZoneId={selectedZone?.id} onSelectZone={(z) => setSelectedZone(z)} />
  );
  // Removed legacy alertsEl; overlay implemented below
  const camerasEl = (
    <div className="sm:hidden mk-border rounded-lg mk-surface-alt backdrop-blur p-3 space-y-3">
      <div className="text-xs font-semibold mk-text-secondary px-1">Cameras</div>
      <div className="flex overflow-x-auto gap-3 pb-2">
        {camerasSeed.map(c => (
          <div key={c.id} className="min-w-[150px] w-40"><CameraStrip cameras={[c]} onSelect={setCameraModal} /></div>
        ))}
      </div>
    </div>
  );

  return (
    <LayoutShell
  topBar={<AdminTopBar zoneFilter={zoneFilter} setZoneFilter={setZoneFilter} zones={zones} live={live} setLive={setLive} search={search} setSearch={setSearch} alertCount={alertCount} onMenu={() => setMobileMenu(true)} onAlertsClick={() => setAlertsOverlayOpen(true)} />}
      sidebar={<Sidebar tabs={navTabs} active={activeNav} onChange={setActiveNav} mobileOpen={mobileMenu} onClose={() => setMobileMenu(false)} />}
    >
      {renderMobileTabs()}
  <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          {activeNav === 'dashboard' && mobileSection === 'map' && mapEl}
          {activeNav === 'cameras' && <Cameras />}
          {activeNav === 'Heat-Map' && <HeatMap/>}
          {activeNav === 'lost-found' && <LostAndFound />}
          {activeNav === 'crowd-analytics' && <CrowdAnalytics />}
          {activeNav === 'alerts' && <Alerts fullPage />}
          {activeNav === 'volunteers' && <Volunteers />}
          {activeNav === 'tasks' && <Tasks />}
          {activeNav === 'reports' && <Reports />}
          {activeNav === 'map-editor' && <MapEditor />}
          {activeNav === 'settings' && <Settings />}
          {(!['dashboard','cameras','lost-found','crowd-analytics','alerts','volunteers','tasks','reports','settings','map-editor'].includes(activeNav)) && (
            <div className="text-sm mk-text-muted p-4 border border-dashed mk-border rounded-lg mk-surface-alt backdrop-blur">Section under construction: {activeNav}</div>
          )}
        </div>
        {/* Right alerts panel (desktop) */}
  {activeNav === 'dashboard' && (
          <div className="hidden lg:flex flex-col w-80 xl:w-96 lg:shrink-0 border-l mk-border mk-surface-alt backdrop-blur rounded-lg overflow-hidden shadow-sm">
            <Alerts onActiveCountChange={setAlertCount} />
          </div>
        )}
      </div>

      {/* Mobile conditional sections */}
      {/* Alerts overlay for < lg */}
      {alertsOverlayOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={()=>setAlertsOverlayOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] max-w-full mk-surface-alt backdrop-blur-xl shadow-xl border-l mk-border flex flex-col transform translate-x-0">
            <div className="px-4 py-3 border-b mk-border flex items-center justify-between">
              <h2 className="text-sm font-semibold mk-text-primary">Alerts</h2>
              <button onClick={()=>setAlertsOverlayOpen(false)} className="mk-text-muted hover:mk-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/50 rounded" aria-label="Close alerts">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Alerts onActiveCountChange={setAlertCount} />
            </div>
          </div>
        </div>
      )}
  {mobileSection === 'cameras' && camerasEl}

      {/* Bottom Camera Strip (desktop/tablet)
      <div className="hidden sm:block fixed left-0 right-0 bottom-0 sm:left-48 md:left-56 bg-white border-t border-gray-200 z-20">
        <div className="px-4 pt-2 pb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Camera Thumbnails</h3>
          <span className="text-[10px] text-gray-500">Auto-refresh 10s</span>
        </div>
        <CameraStrip cameras={camerasSeed} onSelect={setCameraModal} />
      </div>

      {/* Camera Modal */}
      {/* <Modal open={!!cameraModal} onClose={() => setCameraModal(null)} title={cameraModal ? cameraModal.name : ''} actions={[
        <button key="close" onClick={() => setCameraModal(null)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs hover:bg-gray-50">Close</button>
      ]}>
        {cameraModal && (
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-md bg-gray-200 flex items-center justify-center text-gray-500 text-xs">Live Stream Placeholder</div>
            <div className="text-xs text-gray-600">Detection timeline (faces/person counts) coming in Phase 2.</div>
          </div>
        )}
      </Modal> */} 
    </LayoutShell>
  );
};

export default AdminDashboard;
