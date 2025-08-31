import React, { useState, useMemo, useEffect } from "react";
import Tenants from "./Tenants/Tenants";
import Users from "./Users/Users";
import Policies from "./Policies/Policies";
import Models from "./Models/Models";
import AuditLogs from "./AuditLog/AuditLog";
import Analytics from "./Analytics/Analytics";
import LayoutShell from "../General/LayoutShell";
import TopBar from "../General/TopBar";
import Sidebar from "../General/Sidebar";
// Feature components encapsulate their own charts / tables / metric cards now.

// Legacy inline sample data removed after modularization (Tenants/Users/Policies/Models/AuditLogs/Analytics own their data flow)

// Component ----------------------------------------------------------------
const SuperAdminDashboard = () => {
  const tabs = useMemo(
    () => [
      { key: "tenants", label: "Tenants" },
      { key: "users", label: "Users" },
      { key: "policies", label: "Policies" },
      { key: "models", label: "Models" },
      { key: "analytics", label: "Analytics" },
      { key: "audit", label: "Audit Logs" },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState("tenants");
  const [searchTerm, setSearchTerm] = useState("");
  // searchTerm currently provided to TopBar; feature components manage their own data & filters.

  // Render Tab Bodies --------------------------------------------------------
  const renderTenantsTab = () => <Tenants />;
  const renderUsersTab = () => <Users />;
  const renderPoliciesTab = () => <Policies />;

  // Replaced inline models & audit with dedicated feature components
  const renderModelsTab = () => <Models />;
  const renderAuditTab = () => <AuditLogs />;

  const renderAnalyticsTab = () => <Analytics />;

  const tabBody = {
    tenants: renderTenantsTab(),
    users: renderUsersTab(),
    policies: renderPoliciesTab(),
    models: renderModelsTab(),
  analytics: renderAnalyticsTab(),
    audit: renderAuditTab(),
  }[activeTab];

  return (
    <div className="mk-gradient-bg min-h-screen flex flex-col">
      <LayoutShell
        topBar={
          <TopBar
            onSearch={setSearchTerm}
            searchTerm={searchTerm}
            modelVersion="1.3.0"
          />
        }
        sidebar={<Sidebar tabs={tabs} active={activeTab} onChange={setActiveTab} />}
      >
        {/* Mobile Tab Switcher */}
        <div className="sm:hidden mb-4 overflow-x-auto pb-1 -mx-1">
          <div className="flex gap-2 w-max px-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`mk-btn-tab ${activeTab === t.key ? 'mk-btn-tab-active' : ''}`}
                aria-current={activeTab === t.key ? 'page' : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mk-animate-in space-y-4">
          {tabBody}
        </div>
        {/* Feature components encapsulate their own modals/drawers */}
      </LayoutShell>
    </div>
  );
};

export default SuperAdminDashboard;
