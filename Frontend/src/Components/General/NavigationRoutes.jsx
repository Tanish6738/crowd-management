import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

/*
  Landing page / gateway to role dashboards.
  Uses theme tokens (mk-*) for cohesive styling with dark/light support.
*/
const roles = [
  { to: "/superAdminDashboard", label: "Super Admin", blurb: "Multi-tenant governance & global policies." },
  { to: "/adminDashboard", label: "Admin", blurb: "Operational configuration & system health." },
  { to: "/volunteerDashboard", label: "Volunteer", blurb: "Assist with tasks, crowd guidance, reports." },
];

const features = [
  { title: "Live Monitoring", desc: "Instant multi-camera previews with adaptive quality." },
  { title: "Heat Maps", desc: "Density & flow visualizations to predict congestion." },
  { title: "Anomaly Alerts", desc: "Automated triggers for threshold breaches & events." },
  { title: "Tasks & Coordination", desc: "Dispatch, assignment & volunteer follow‑through." },
  { title: "Audit Trail", desc: "Immutable actions log for compliance & review." },
  { title: "Scalable API", desc: "Standards‑based integration for external systems." },
];

const Stat = ({ k, v }) => (
  <div className="flex flex-col items-start gap-1">
    <span className="text-2xl font-semibold tracking-tight mk-text-primary leading-none">{v}</span>
    <span className="text-[11px] uppercase tracking-wide mk-text-muted">{k}</span>
  </div>
);

const NavigationRoutes = () => {
  const navigate = useNavigate();
  return (
    <main className="mk-gradient-bg min-h-dvh w-full relative overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-28 pb-24 md:pt-32 md:pb-32">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-8 mk-animate-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mk-subtle text-[11px] uppercase tracking-wide border border-white/10 shadow-sm">
              <span className="mk-text-secondary font-medium">Unified Crowd Intelligence</span>
              <span className="mk-badge-accent mk-badge !text-[9px]">Beta</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              Orchestrate <span className="mk-accent">People Flow</span> with Precision
            </h1>
            <p className="max-w-xl mk-text-secondary text-sm md:text-base leading-relaxed">
              A modular platform for surveillance, situational awareness & rapid response. Move seamlessly between strategic oversight and field execution.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={()=> navigate('/sign-in')}
                className="h-11 px-6 text-sm font-medium rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-neutral-900 shadow hover:shadow-lg transition focus:outline-none focus-visible:shadow-[var(--mk-focus-ring)]"
              >Get Started</button>
              <button
                onClick={()=> document.getElementById('roles')?.scrollIntoView({behavior:'smooth'})}
                className="h-11 px-6 text-sm font-medium rounded-lg mk-subtle hover:mk-interactive transition"
              >Explore Roles</button>
            </div>
            <div className="flex gap-10 pt-4">
              <Stat k="Active Areas" v="24" />
              <Stat k="CCTV Streams" v="120+" />
              <Stat k="Avg. Response" v="<30s" />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-8 bg-[conic-gradient(at_30%_30%,rgba(255,143,42,0.15),transparent_60%)] blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4 p-6 mk-panel rounded-2xl">
              {features.slice(0,4).map(f => (
                <div key={f.title} className="mk-route-card p-4 hover:translate-y-[-3px] transition flex flex-col gap-2">
                  <span className="text-sm font-semibold mk-text-primary tracking-tight">{f.title}</span>
                  <span className="text-[11px] leading-relaxed mk-text-muted">{f.desc}</span>
                </div>
              ))}
              <div className="col-span-2 mk-subtle p-5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold mk-text-primary">Real‑time Heatmaps</p>
                  <p className="text-[11px] mk-text-muted">Density gradients updated every few seconds.</p>
                </div>
                <button onClick={()=> navigate('/adminDashboard')} className="mk-btn-tab mk-btn-tab-active !text-[11px]">View</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative max-w-7xl mx-auto px-6 pb-28">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="mk-route-card p-5 flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold mk-text-primary tracking-wide">{f.title}</h3>
                <span className="mk-badge text-[9px]">Core</span>
              </div>
              <p className="text-[11px] leading-relaxed mk-text-muted group-hover:mk-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards */}
      <section id="roles" className="relative max-w-6xl mx-auto px-6 pb-32">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight mk-text-primary">Dashboards by Role</h2>
            <p className="mk-text-muted text-xs mt-2 max-w-md">Role‑tailored interfaces expose only the controls and insights each persona needs.</p>
          </div>
          <button onClick={()=> navigate('/sign-up')} className="mk-btn-tab mk-btn-tab-active hidden md:inline-flex">Create Account</button>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map(r => (
            <li key={r.to}>
              <NavLink
                to={r.to}
                className={({ isActive }) => `mk-route-card relative block p-5 h-full focus:outline-none focus-visible:shadow-[var(--mk-focus-ring)] transition ${isActive? 'mk-route-card-active':''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold tracking-wide uppercase mk-text-secondary group-hover:mk-text-primary">{r.label}</span>
                  <span className="mk-badge text-[9px]">Dash</span>
                </div>
                <p className="text-[11px] mk-text-muted leading-relaxed pr-4">{r.blurb}</p>
                <span className="absolute bottom-4 right-4 text-[10px] mk-text-faint">Open →</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="relative max-w-5xl mx-auto px-6 pb-28">
        <div className="mk-panel p-10 rounded-2xl flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-xl font-semibold tracking-tight">Ready to operationalize real‑time awareness?</h3>
            <p className="text-sm mk-text-secondary leading-relaxed">Deploy cameras, configure zones & start receiving actionable intelligence within minutes.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={()=> navigate('/sign-in')} className="mk-btn-tab mk-btn-tab-active">Sign In</button>
            <button onClick={()=> navigate('/sign-up')} className="mk-btn-tab">Register</button>
          </div>
        </div>
      </section>

      <footer className="relative max-w-6xl mx-auto px-6 pb-10 text-[11px] mk-text-fainter flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <p>© {new Date().getFullYear()} Crowd Management Platform</p>
        <p className="flex gap-4">
          <span className="hover:mk-text-secondary cursor-pointer">Status</span>
          <span className="hover:mk-text-secondary cursor-pointer">API</span>
          <span className="hover:mk-text-secondary cursor-pointer">Docs</span>
        </p>
      </footer>
    </main>
  );
};

export default NavigationRoutes;
