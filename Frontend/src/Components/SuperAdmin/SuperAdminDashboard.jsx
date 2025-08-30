import React, { useState, useMemo, useEffect } from 'react';
import LayoutShell from '../General/LayoutShell';
import TopBar from '../General/TopBar';
import Sidebar from '../General/Sidebar';
import MetricCard from '../General/MetricCard';
import DataTable from '../General/DataTable';
import StatusDot from '../General/StatusDot';
import Modal from '../General/Modal';
import Drawer from '../General/Drawer';
import ChartCard from '../General/ChartCard';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell
} from 'recharts';

// Sample Data (MVP) ---------------------------------------------------------
const tenantsSeed = [
  { id: 't1', name: 'Kumbh Core', status: 'Active', zones: 12, storage: '320', alerts: 14, lastActivity: '2m ago' },
  { id: 't2', name: 'Riverbank Ops', status: 'Warning', zones: 8, storage: '180', alerts: 22, lastActivity: '7m ago' },
  { id: 't3', name: 'Transit Hub', status: 'Active', zones: 5, storage: '90', alerts: 4, lastActivity: '12m ago' },
  { id: 't4', name: 'North Camp', status: 'Suspended', zones: 0, storage: '12', alerts: 0, lastActivity: '1d ago' },
];
const usersSeed = [
  { id: 'u1', name: 'Arjun Mehta', roles: 'Admin', phone: '+91 98000 1111', email: 'arjun@corp.io', status: 'Active' },
  { id: 'u2', name: 'Priya Singh', roles: 'Super Admin', phone: '+91 98000 2222', email: 'priya@corp.io', status: 'Active' },
  { id: 'u3', name: 'Rahul Verma', roles: 'Viewer', phone: '+91 98000 3333', email: 'rahul@corp.io', status: 'Suspended' },
];
const auditSeedInitial = [
  { id: 'a1', time: '09:21:34', actor: 'Priya', action: 'UPDATE_POLICY', entity: 'Thresholds', result: 'OK', ip: '10.4.3.11' },
  { id: 'a2', time: '09:10:02', actor: 'Arjun', action: 'CREATE_TENANT', entity: 'Transit Hub', result: 'OK', ip: '10.4.3.8' },
  { id: 'a3', time: '08:55:12', actor: 'System', action: 'HEALTH_PING', entity: 'All', result: 'OK', ip: '127.0.0.1' },
];

// Component ----------------------------------------------------------------
const SuperAdminDashboard = () => {
  const tabs = useMemo(() => [
    { key: 'tenants', label: 'Tenants' },
    { key: 'users', label: 'Users' },
    { key: 'policies', label: 'Policies' },
    { key: 'models', label: 'Models' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'audit', label: 'Audit Logs' },
  ], []);

  const [activeTab, setActiveTab] = useState('tenants');
  const [searchTerm, setSearchTerm] = useState('');
  const [tenants] = useState(tenantsSeed);
  const [users] = useState(usersSeed);
  const [auditLogs, setAuditLogs] = useState(auditSeedInitial);
  const [policyValues, setPolicyValues] = useState({ cpu: 70, cameras: 92, embeddings: 1200 });
  const [policyOpen, setPolicyOpen] = useState(false);
  const [drawerTenant, setDrawerTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600); // simulate loading
    return () => clearTimeout(t);
  }, []);

  // Filter helpers ----------------------------------------------------------
  const visibleTenants = tenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const visibleUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const visibleAudit = auditLogs.filter(a => Object.values(a).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())));

  // Columns -----------------------------------------------------------------
  const tenantColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Status', accessor: 'status', cell: r => <StatusDot status={r.status} /> },
    { header: 'Zones', accessor: 'zones', hideSm: true },
    { header: 'Storage (GB)', accessor: 'storage', hideSm: true },
    { header: 'Alerts', accessor: 'alerts' },
    { header: 'Last Activity', accessor: 'lastActivity', hideSm: true },
    { header: 'Actions', accessor: 'actions', cell: () => <button className="text-orange-600 hover:underline text-xs">View</button>, hideSm: true },
  ];
  const userColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Role(s)', accessor: 'roles' },
    { header: 'Phone', accessor: 'phone', hideSm: true },
    { header: 'Email', accessor: 'email', hideSm: true },
    { header: 'Status', accessor: 'status', cell: r => <StatusDot status={r.status === 'Active' ? 'Active' : 'Suspended'} label={r.status} /> },
    { header: 'Actions', accessor: 'actions', cell: () => <button className="text-orange-600 hover:underline text-xs">View</button>, hideSm: true },
  ];
  const auditColumns = [
    { header: 'Time', accessor: 'time' },
    { header: 'Actor', accessor: 'actor' },
    { header: 'Action', accessor: 'action' },
    { header: 'Entity', accessor: 'entity' },
    { header: 'Result', accessor: 'result' },
    { header: 'IP', accessor: 'ip' },
  ];
  const modelColumns = [
    { header: 'Model', accessor: 'model' },
    { header: 'Version', accessor: 'version' },
    { header: 'Status', accessor: 'status', cell: r => <StatusDot status={r.status} /> },
    { header: 'Updated', accessor: 'updated' },
    { header: 'Actions', accessor: 'actions', cell: () => <div className="flex gap-2"><button className="text-orange-600 text-xs hover:underline">Deploy</button><button className="text-gray-500 text-xs hover:underline">Rollback</button></div> },
  ];
  const models = [
    { id: 'm1', model: 'FaceRec', version: '1.3.0', status: 'Active', updated: '1h ago' },
    { id: 'm2', model: 'CrowdCount', version: '2.1.1', status: 'Active', updated: '3h ago' },
    { id: 'm3', model: 'AlertClassify', version: '0.9.5', status: 'Warning', updated: '2d ago' },
  ];

  // Metric Values (derived) --------------------------------------------------
  const metricCards = [
    { title: 'Active Tenants', value: tenants.filter(t => t.status === 'Active').length },
    { title: 'Total Users', value: users.length },
    { title: 'Cameras Online %', value: '94%' },
    { title: 'Daily Matches Reviewed', value: 38 },
    { title: 'Avg Match Latency', value: '420ms' },
  ];

  // Analytics sample data ---------------------------------------------------
  const throughputData = [
    { time: '09:00', embeddings: 900, alerts: 3 },
    { time: '09:10', embeddings: 1100, alerts: 4 },
    { time: '09:20', embeddings: 1250, alerts: 2 },
    { time: '09:30', embeddings: 1500, alerts: 5 },
    { time: '09:40', embeddings: 1400, alerts: 6 },
    { time: '09:50', embeddings: 1600, alerts: 4 },
  ];
  const severityData = [
    { sev: 'Low', count: 34 },
    { sev: 'Med', count: 22 },
    { sev: 'High', count: 9 },
    { sev: 'Critical', count: 3 },
  ];
  const tenantStatusCounts = tenants.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
  const tenantPie = Object.entries(tenantStatusCounts).map(([name, value]) => ({ name, value }));
  const pieColors = ['#22c55e', '#f97316', '#dc2626', '#6b7280'];

  // Policy save handler ------------------------------------------------------
  const handlePolicySave = () => {
    setPolicyOpen(false);
    setAuditLogs(prev => [
      { id: 'a' + (prev.length + 1), time: new Date().toLocaleTimeString(), actor: 'Priya', action: 'UPDATE_POLICY', entity: 'Thresholds', result: 'OK', ip: '10.4.3.11' },
      ...prev,
    ]);
  };

  // Render Tab Bodies --------------------------------------------------------
  const renderTenantsTab = () => (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 overflow-x-auto snap-x -mx-1 px-1 pb-1">{/* metric row */}
        {metricCards.map(m => (
          <div key={m.title} className="snap-start min-w-[160px]">
            <MetricCard title={m.title} value={m.value} loading={loading} />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <DataTable
            caption="Tenants"
            columns={tenantColumns}
            data={loading ? [] : visibleTenants}
            onRowClick={row => setDrawerTenant(row)}
            empty={loading ? 'Loading...' : 'No tenants'}
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 px-1">Recent Audit</h3>
            <DataTable
              caption="Audit Logs (excerpt)"
              columns={auditColumns}
              data={loading ? [] : auditLogs.slice(0,5)}
              empty={loading ? 'Loading...' : 'No logs'}
            />
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-4">
      <DataTable columns={userColumns} data={visibleUsers} empty="No users" caption="Users" />
    </div>
  );

  const renderPoliciesTab = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-orange-200 bg-white shadow-sm flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Current Thresholds</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="px-2 py-1 bg-orange-50 border border-orange-200 rounded">CPU &lt; {policyValues.cpu}%</span>
          <span className="px-2 py-1 bg-orange-50 border border-orange-200 rounded">Cameras Online ≥ {policyValues.cameras}%</span>
          <span className="px-2 py-1 bg-orange-50 border border-orange-200 rounded">Embeddings/sec ≥ {policyValues.embeddings}</span>
        </div>
        <div>
          <button onClick={() => setPolicyOpen(true)} className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500">Edit Policies</button>
        </div>
      </div>
      <p className="text-xs text-gray-500">Adjust thresholds to tune alerting & resource usage. Changes are logged to the audit trail.</p>
    </div>
  );

  const renderModelsTab = () => (
    <div className="space-y-4">
      <DataTable columns={modelColumns} data={models} empty="No models" caption="Models" />
    </div>
  );

  const renderAuditTab = () => (
    <div className="space-y-4">
      <DataTable columns={auditColumns} data={visibleAudit} empty="No logs" caption="Audit Logs" />
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="flex flex-col gap-6">
      {/* Top metrics reused */}
      <div className="flex gap-4 overflow-x-auto snap-x -mx-1 px-1 pb-1">
        {metricCards.slice(0,3).map(m => (
          <div key={m.title} className="snap-start min-w-[160px]">
            <MetricCard title={m.title} value={m.value} loading={loading} />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <ChartCard title="Embeddings Throughput" description="Per 10m window" className="lg:col-span-2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={throughputData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip wrapperClassName="text-xs" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="embeddings" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="alerts" stroke="#f97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Alerts by Severity" description="Last hour" className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="sev" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip wrapperClassName="text-xs" />
              <Bar dataKey="count" fill="#dc2626" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Tenant Status Distribution" description="Current" className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={tenantPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {tenantPie.map((entry, index) => (
                  <Cell key={`c-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip wrapperClassName="text-xs" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Alerts & Embeddings" description="Overlay comparison" className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip wrapperClassName="text-xs" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="alerts" fill="#f97316" radius={[4,4,0,0]} />
              <Bar dataKey="embeddings" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );

  const tabBody = {
    tenants: renderTenantsTab(),
    users: renderUsersTab(),
    policies: renderPoliciesTab(),
    models: renderModelsTab(),
    analytics: renderAnalyticsTab(),
    audit: renderAuditTab(),
  }[activeTab];

  return (
    <LayoutShell
      topBar={<TopBar onSearch={setSearchTerm} searchTerm={searchTerm} modelVersion="1.3.0" />}
      sidebar={<Sidebar tabs={tabs} active={activeTab} onChange={setActiveTab} />}
    >
      {/* Mobile Tab Switcher */}
      <div className="sm:hidden mb-4 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${activeTab === t.key ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300 text-gray-600'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      {tabBody}

      {/* Policy Modal */}
      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="Edit Threshold Policies"
        actions={[
          <button key="cancel" onClick={() => setPolicyOpen(false)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs hover:bg-gray-50">Cancel</button>,
          <button key="save" onClick={handlePolicySave} className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium hover:bg-orange-600">Save</button>
        ]}
      >
        <form className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1">CPU %</label>
            <input type="range" min={10} max={100} value={policyValues.cpu} onChange={e => setPolicyValues(v => ({ ...v, cpu: Number(e.target.value) }))} className="w-full accent-orange-500" />
            <div className="text-xs text-gray-600 mt-1">{policyValues.cpu}%</div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Cameras Online %</label>
            <input type="range" min={50} max={100} value={policyValues.cameras} onChange={e => setPolicyValues(v => ({ ...v, cameras: Number(e.target.value) }))} className="w-full accent-orange-500" />
            <div className="text-xs text-gray-600 mt-1">{policyValues.cameras}%</div>
          </div>
            <div>
            <label className="block text-xs font-medium mb-1">Embeddings / sec</label>
            <input type="range" min={200} max={3000} step={50} value={policyValues.embeddings} onChange={e => setPolicyValues(v => ({ ...v, embeddings: Number(e.target.value) }))} className="w-full accent-orange-500" />
            <div className="text-xs text-gray-600 mt-1">{policyValues.embeddings}</div>
          </div>
        </form>
      </Modal>

      {/* Tenant Drawer */}
      <Drawer
        open={!!drawerTenant}
        onClose={() => setDrawerTenant(null)}
        title={drawerTenant ? `Tenant: ${drawerTenant.name}` : ''}
      >
        {drawerTenant && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-500">Status</div>
                <div className="font-medium">{drawerTenant.status}</div>
              </div>
              <div>
                <div className="text-gray-500">Zones</div>
                <div className="font-medium">{drawerTenant.zones}</div>
              </div>
              <div>
                <div className="text-gray-500">Storage</div>
                <div className="font-medium">{drawerTenant.storage} GB</div>
              </div>
              <div>
                <div className="text-gray-500">Alerts 24h</div>
                <div className="font-medium">{drawerTenant.alerts}</div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Overview</h4>
              <p className="text-xs text-gray-600 leading-relaxed">Placeholder overview for <strong>{drawerTenant.name}</strong>. Future tabs: Config, Usage, Retention.</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* Sticky Policy Summary (Policies tab only) */}
      {activeTab === 'policies' && (
        <div className="fixed bottom-0 left-0 right-0 sm:left-48 md:left-56 bg-white border-t border-orange-200 shadow-inner px-4 py-3 flex flex-wrap gap-3 items-center z-20 text-xs">
          <div className="font-semibold text-gray-700">Threshold Summary:</div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded bg-orange-50 border border-orange-200">CPU &lt; {policyValues.cpu}%</span>
            <span className="px-2 py-1 rounded bg-orange-50 border border-orange-200">Cameras ≥ {policyValues.cameras}%</span>
            <span className="px-2 py-1 rounded bg-orange-50 border border-orange-200">Emb/sec ≥ {policyValues.embeddings}</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setPolicyOpen(true)} className="px-3 py-1.5 rounded bg-orange-500 text-white font-medium hover:bg-orange-600">Edit</button>
        </div>
      )}
    </LayoutShell>
  );
};

export default SuperAdminDashboard;
