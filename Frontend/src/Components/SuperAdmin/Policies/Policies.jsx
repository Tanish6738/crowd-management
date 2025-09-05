import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../General/Modal";
import Drawer from "../../General/Drawer";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  RefreshCcw,
  Settings2,
  SlidersHorizontal,
  Database,
  AlertTriangle,
  Clock,
  Scale,
  Layers,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Edit3,
  ListTree,
} from "lucide-react";

/**
 * @typedef {Object} GlobalPolicy
 * @property {string} id
 * @property {{ framesDays:number; embeddingsDays:number; logsDays:number }} retention
 * @property {{ normalPct:number; busyPct:number; criticalPct:number }} thresholds
 * @property {string} updatedBy
 * @property {string} updatedAt // ISO
 */

const defaultPolicy = /** @type {GlobalPolicy} */ ({
  id: "global",
  retention: { framesDays: 30, embeddingsDays: 14, logsDays: 60 },
  thresholds: { normalPct: 40, busyPct: 70, criticalPct: 90 },
  updatedBy: "system",
  updatedAt: new Date().toISOString(),
});

const skeletonCard = (key) => (
  <div
    key={key}
    className="p-4 rounded-lg mk-subtle animate-pulse space-y-3"
  >
    <div className="h-4 w-32 rounded bg-[var(--mk-muted)]/30" />
    <div className="h-6 w-20 rounded bg-[var(--mk-muted)]/30" />
  </div>
);

const Policies = () => {
  const [policy, setPolicy] = useState(null); // GlobalPolicy | null
  const [overrides, setOverrides] = useState([]); // tenant overrides summary
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(defaultPolicy);
  const [saving, setSaving] = useState(false);
  const [tenantDrawer, setTenantDrawer] = useState(null);

  // Simulated fetch
  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setPolicy(defaultPolicy);
        setOverrides([
          {
            tenant: "Riverbank Ops",
            retention: true,
            thresholds: false,
            updatedAt: new Date(Date.now() - 3600_000).toISOString(),
            updatedBy: "priya",
          },
          {
            tenant: "Transit Hub",
            retention: false,
            thresholds: true,
            updatedAt: new Date(Date.now() - 7200_000).toISOString(),
            updatedBy: "arjun",
          },
        ]);
        setAudit([
          {
            id: "a1",
            by: "priya",
            when: new Date(Date.now() - 3600_000).toISOString(),
            action: "UPDATE_RETENTION",
            detail: "framesDays 21→30",
          },
          {
            id: "a2",
            by: "arjun",
            when: new Date(Date.now() - 7200_000).toISOString(),
            action: "UPDATE_THRESHOLDS",
            detail: "busyPct 65→70",
          },
        ]);
        setLoading(false);
      } catch (e) {
        setError("Failed to load policies");
        setLoading(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, []);

  // Simulated WebSocket updates every 45s
  useEffect(() => {
    if (!policy) return;
    const iv = setInterval(() => {
      // pretend threshold drift check - no actual change
    }, 45000);
    return () => clearInterval(iv);
  }, [policy]);

  const openEditor = () => {
    setForm(policy || defaultPolicy);
    setEditOpen(true);
  };

  const retentionCards = () => (
    <div className="grid md:grid-cols-3 gap-4">
      {["framesDays", "embeddingsDays", "logsDays"].map((k) => (
        <div key={k} className="p-4 rounded-lg mk-subtle flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide mk-text-faint">
            {k.replace("Days", "").replace(/([A-Z])/g, " $1") } (days)
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={180}
              value={policy.retention[k]}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  retention: { ...p.retention, [k]: Number(e.target.value) },
                }))
              }
              className="flex-1 accent-orange-500"
            />
            <div className="w-12 text-right tabular-nums text-sm font-medium mk-text-primary">
              {policy.retention[k]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
  const resetDefaults = () => {
    setForm(defaultPolicy);
  };

  const handleSave = (e) => {
    e?.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setPolicy(form);
      setAudit((a) => [
        {
          id: "a" + (a.length + 1),
          by: "you",
          when: new Date().toISOString(),
          action: "UPDATE_GLOBAL",
          detail: "Saved global policies",
        },
        ...a,
      ]);
      setEditOpen(false);
      setSaving(false);
    }, 900);
  };

  const relative = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const d = Math.floor(h / 24);
    return d + "d ago";
  };

  const thresholdRangesValid =
    form.thresholds.normalPct < form.thresholds.busyPct &&
    form.thresholds.busyPct < form.thresholds.criticalPct;


  const thresholdsCard = () => (
    <div className="p-4 rounded-lg mk-subtle space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
        <SlidersHorizontal size={14} className="text-orange-400" /> Crowd
        Thresholds (%)
      </div>
      <div className="space-y-3 text-sm">
        {["normalPct", "busyPct", "criticalPct"].map((k) => (
          <div key={k} className="flex items-center gap-3">
            <label className="w-28 capitalize text-xs text-white/50">
              {k.replace("Pct", "")}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={policy.thresholds[k]}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  thresholds: { ...p.thresholds, [k]: Number(e.target.value) },
                }))
              }
              className="h-8 w-20 rounded border border-white/10 bg-white/5 px-2 text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
            <input
              type="range"
              min={1}
              max={100}
              value={policy.thresholds[k]}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  thresholds: { ...p.thresholds, [k]: Number(e.target.value) },
                }))
              }
              className="flex-1 accent-orange-500"
            />
          </div>
        ))}
        {!thresholdRangesValid && (
          <div className="text-xs text-red-400">
            Ordering must be: normal &lt; busy &lt; critical.
          </div>
        )}
        <div className="text-[11px] text-white/50">
          Normal (&lt; {policy.thresholds.normalPct}%) · Busy (
          {policy.thresholds.normalPct}–{policy.thresholds.busyPct}%) · Critical
          (&gt; {policy.thresholds.busyPct}%)
        </div>
      </div>
    </div>
  );

  const overridesTable = () => (
    <div className="rounded-lg mk-panel overflow-hidden">
      <table className="min-w-full text-xs mk-table-zebra">
        <thead className="mk-subtle backdrop-blur text-[11px] uppercase tracking-wide mk-text-faint">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Tenant</th>
            <th className="px-3 py-2 text-left font-medium">
              Retention Override
            </th>
            <th className="px-3 py-2 text-left font-medium">
              Threshold Override
            </th>
            <th className="px-3 py-2 text-left font-medium">Last Modified</th>
            <th className="px-3 py-2 text-left font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="mk-text-primary/90">
          {overrides.map((o) => (
            <tr
              key={o.tenant}
              className="mk-row-hover-accent cursor-pointer transition-colors"
            >
              <td className="px-3 py-2 font-medium text-white">{o.tenant}</td>
              <td className="px-3 py-2">
                {o.retention ? (
                  <span className="mk-badge mk-badge-accent text-[9px]">
                    Yes
                  </span>
                ) : (
                  <span className="mk-badge mk-text-fainter text-[9px]">
                    No
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {o.thresholds ? (
                  <span className="mk-badge mk-badge-accent text-[9px]">
                    Yes
                  </span>
                ) : (
                  <span className="mk-badge mk-text-fainter text-[9px]">
                    No
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-white/60 tabular-nums">
                {relative(o.updatedAt)}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => setTenantDrawer(o)}
                  className="text-[var(--mk-accent)] hover:underline text-[11px] flex items-center gap-1"
                >
                  View <ExternalLink size={12} />
                </button>
              </td>
            </tr>
          ))}
          {!overrides.length && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-6 text-center text-white/50 text-sm"
              >
                No overrides.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const auditList = () => (
    <div className="rounded-lg mk-panel max-h-72 overflow-auto">
      <ul className="divide-y divide-white/5 text-[11px] mk-text-primary">
        {audit.map((a) => (
          <li key={a.id} className="px-3 py-2 flex items-start gap-3">
            <span className="mt-0.5 text-white/30">•</span>
            <div className="flex-1">
              <div className="font-medium text-white/90">{a.action}</div>
              <div className="text-white/60">{a.detail}</div>
              <div className="text-[10px] text-white/40">
                {a.by} · {relative(a.when)}
              </div>
            </div>
          </li>
        ))}
        {!audit.length && (
          <li className="px-4 py-6 text-center text-white/50">
            No audit entries.
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8" aria-label="Global Policies">
      <div className="flex flex-wrap items-center gap-3">
  <h2 className="text-sm font-semibold mk-text-primary flex items-center gap-2">
          <ShieldCheck size={18} className="text-orange-400" /> Global Policies
        </h2>
        {!loading && !error && policy && (
          <button
            onClick={openEditor}
            className="ml-auto px-3 h-9 rounded-md bg-[var(--mk-accent)]/90 hover:bg-[var(--mk-accent)] text-white text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Edit3 size={14} /> Edit Policies
          </button>
        )}
      </div>

      {loading && (
        <div className="grid md:grid-cols-3 gap-4">
          {["a", "b", "c", "d"].map(skeletonCard)}
        </div>
      )}
      {error && (
        <div className="p-4 rounded mk-subtle ring-1 ring-red-500/30 bg-red-500/10 text-sm text-red-400 flex items-center gap-3">
          <XCircle size={18} /> {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-auto px-3 py-1.5 rounded bg-red-500/80 hover:bg-red-500 text-white text-xs"
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && !policy && (
    <div className="p-6 rounded-lg border-2 border-dashed border-[var(--mk-border)]/40 text-center text-sm mk-text-faint flex flex-col items-center gap-4">
          <ShieldCheck size={40} className="text-orange-400" />
          <div>No global policies defined yet.</div>
          <button
            onClick={openEditor}
      className="px-4 py-2 rounded-md bg-[var(--mk-accent)]/90 hover:bg-[var(--mk-accent)] text-white text-xs font-medium"
          >
            Set Defaults
          </button>
        </div>
      )}

      {!loading && !error && policy && (
        <div className="space-y-10">
          <section className="space-y-5" aria-labelledby="retention-heading">
            <h3
              id="retention-heading"
              className="text-xs font-semibold mk-text-faint tracking-wide uppercase flex items-center gap-2"
            >
              <Database size={14} className="text-orange-400" /> Retention
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {["framesDays", "embeddingsDays", "logsDays"].map((k) => (
                <div key={k} className="p-4 rounded-lg mk-subtle flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium mk-text-faint uppercase tracking-wide">
                      {k.replace("Days", "").replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="text-xs font-semibold tabular-nums mk-text-primary">
                      {policy.retention[k]}d
                    </span>
                  </div>
                  <div className="h-2 rounded bg-[var(--mk-muted)]/30 overflow-hidden">
                    <div
                      className="h-full bg-[var(--mk-accent)]"
                      style={{ width: (policy.retention[k] / 180) * 100 + "%" }}
                    />
                  </div>
                  <div className="text-[10px] mk-text-fainter">
                    Storage retention horizon.
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5" aria-labelledby="thresholds-heading">
            <h3
              id="thresholds-heading"
              className="text-xs font-semibold mk-text-faint tracking-wide uppercase flex items-center gap-2"
            >
              <AlertTriangle size={14} className="text-orange-400" /> Crowd
              Thresholds
            </h3>
            <div className="p-4 rounded-lg mk-subtle grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-xs mk-text-fainter uppercase tracking-wide">
                  Normal (&lt;{policy.thresholds.normalPct}%)
                </div>
        <div className="h-2 bg-green-500/40 rounded" />
              </div>
              <div className="space-y-1">
                <div className="text-xs mk-text-fainter uppercase tracking-wide">
                  Busy ({policy.thresholds.normalPct}–
                  {policy.thresholds.busyPct}%)
                </div>
        <div className="h-2 bg-orange-500/50 rounded" />
              </div>
              <div className="space-y-1">
                <div className="text-xs mk-text-fainter uppercase tracking-wide">
                  Critical (&gt;{policy.thresholds.busyPct}%)
                </div>
        <div className="h-2 bg-red-500/50 rounded" />
              </div>
            </div>
          </section>

          <section className="space-y-5" aria-labelledby="overrides-heading">
            <div className="flex items-center gap-2">
              <h3
                id="overrides-heading"
                className="text-xs font-semibold mk-text-faint tracking-wide uppercase flex items-center gap-2"
              >
                <Layers size={14} className="text-orange-400" /> Tenant
                Overrides
              </h3>
                <span className="mk-badge text-[10px] mk-text-faint">
                {overrides.length}
              </span>
            </div>
            {overridesTable()}
          </section>

          <section className="space-y-4" aria-labelledby="audit-heading">
            <h3
              id="audit-heading"
              className="text-xs font-semibold mk-text-faint tracking-wide uppercase flex items-center gap-2"
            >
              <ListTree size={14} className="text-orange-400" /> Audit Trail
            </h3>
            {auditList()}
          </section>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Global Policies"
        actions={[
          <button
            key="reset"
            onClick={resetDefaults}
            type="button"
            className="px-3 py-1.5 rounded mk-subtle text-xs mk-text-faint hover:brightness-110 transition"
          >
            Reset to Default
          </button>,
          <button
            key="save"
            onClick={handleSave}
            disabled={!thresholdRangesValid || saving}
            className="px-3 py-1.5 rounded bg-[var(--mk-accent)]/90 hover:bg-[var(--mk-accent)] text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCcw size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}{" "}
            Save
          </button>,
        ]}
      >
        <form onSubmit={handleSave} className="space-y-8 text-sm">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold mk-text-primary uppercase tracking-wide flex items-center gap-2">
              <Database size={14} className="text-orange-400" /> Retention Days
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              {["framesDays", "embeddingsDays", "logsDays"].map((k) => (
                <div key={k} className="space-y-2">
                  <label className="text-xs mk-text-fainter uppercase tracking-wide flex justify-between">
                    <span>
                      {k.replace("Days", "").replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="tabular-nums mk-text-primary">
                      {form.retention[k]}d
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.retention[k]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        retention: {
                          ...f.retention,
                          [k]: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full h-8 rounded mk-subtle px-2 mk-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]/40"
                  />
                  <input
                    type="range"
                    min={1}
                    max={365}
                    value={form.retention[k]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        retention: {
                          ...f.retention,
                          [k]: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-[var(--mk-accent)]"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-semibold mk-text-primary uppercase tracking-wide flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-orange-400" /> Crowd
              Thresholds (%)
            </h4>
            {["normalPct", "busyPct", "criticalPct"].map((k) => (
              <div key={k} className="flex items-center gap-4">
                <label className="w-24 capitalize text-xs mk-text-fainter">
                  {k.replace("Pct", "")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.thresholds[k]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      thresholds: {
                        ...f.thresholds,
                        [k]: Number(e.target.value),
                      },
                    }))
                  }
                  className="h-8 w-20 rounded mk-subtle px-2 mk-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]/40"
                />
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={form.thresholds[k]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      thresholds: {
                        ...f.thresholds,
                        [k]: Number(e.target.value),
                      },
                    }))
                  }
                  className="flex-1 accent-[var(--mk-accent)]"
                />
              </div>
            ))}
            {!thresholdRangesValid && (
              <div className="text-xs text-red-400">
                Ordering must be: normal &lt; busy &lt; critical.
              </div>
            )}
          </div>
          <p className="text-[11px] mk-text-fainter">
            Saving updates global defaults and notifies tenants (policy:update).
          </p>
        </form>
      </Modal>

      {/* Tenant Drawer (override detail placeholder) */}
      <Drawer
        open={!!tenantDrawer}
        onClose={() => setTenantDrawer(null)}
        title={tenantDrawer ? tenantDrawer.tenant : ""}
      >
        {tenantDrawer && (
          <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
        <div className="mk-text-fainter">Retention Override</div>
        <div className="font-medium mk-text-primary">
                  {tenantDrawer.retention ? "Yes" : "No"}
                </div>
              </div>
              <div>
        <div className="mk-text-fainter">Threshold Override</div>
        <div className="font-medium mk-text-primary">
                  {tenantDrawer.thresholds ? "Yes" : "No"}
                </div>
              </div>
              <div>
        <div className="mk-text-fainter">Updated</div>
        <div className="font-medium mk-text-primary">
                  {relative(tenantDrawer.updatedAt)}
                </div>
              </div>
              <div>
        <div className="mk-text-fainter">By</div>
        <div className="font-medium mk-text-primary">
                  {tenantDrawer.updatedBy}
                </div>
              </div>
            </div>
      <p className="text-xs mk-text-faint leading-relaxed">
              Future enhancement: show diff versus global defaults & allow
              clearing overrides.
            </p>
      <button className="px-3 py-1.5 rounded mk-subtle text-xs mk-text-primary hover:brightness-110 transition">
              Open Tenant Detail
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Policies;

/* Integration:
import Policies from './Policies/Policies';
// In SuperAdminDashboard sidebar tabs include { key:'policies', label:'Policies' }
// Render when active: { activeTab==='policies' && <Policies /> }
*/
