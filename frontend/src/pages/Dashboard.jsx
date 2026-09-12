import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useProfiles } from "@/context/ProfileContext";
import { FileText, Share2, Upload, ShieldCheck, ShieldAlert, Monitor, ArrowUpRight, Activity, HeartPulse, Pill, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UploadDialog from "@/components/UploadDialog";

const catColor = {
  Prescriptions: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
  "Lab Reports": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900",
  Imaging: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-900",
  Vaccinations: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  Insurance: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  Other: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { active } = useProfiles();
  const [records, setRecords] = useState([]);
  const [shares, setShares] = useState([]);
  const [audit, setAudit] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async () => {
    if (!active) return;
    const [r, s, a, ss] = await Promise.all([
      api.get(`/records?profile_id=${active.id}`),
      api.get("/shares"),
      api.get("/audit?limit=8"),
      api.get("/sessions"),
    ]);
    setRecords(r.data); setShares(s.data); setAudit(a.data); setSessions(ss.data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [active?.id]);

  const activeShares = shares.filter((x) => x.status === "active");
  const health = active?.health || {};

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Greeting */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Vault</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Hello, {user?.name?.split(" ")[0]}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Viewing records for <span className="font-medium text-slate-900 dark:text-white">{active?.name}</span></p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="dashboard-upload-btn">
          <Upload className="w-4 h-4 mr-2" />Upload record
        </Button>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Security Command Bar */}
        <div className="lg:col-span-4 rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-teal-900 text-white">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-medium uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Security
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-teal-100">Two-factor auth</div>
                <div className="text-lg font-semibold">{user?.twofa_enabled ? "Active & enforced" : "Not enabled"}</div>
              </div>
              {user?.twofa_enabled ? <ShieldCheck className="w-8 h-8 text-emerald-400" /> : <ShieldAlert className="w-8 h-8 text-amber-400" />}
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-teal-100">Trusted devices</div>
                <div className="text-lg font-semibold">{sessions.length}</div>
              </div>
              <Monitor className="w-8 h-8 text-teal-300" />
            </div>
            <Link to="/settings"><Button variant="secondary" size="sm" className="w-full bg-white/10 hover:bg-white/20 text-white border-0" data-testid="security-manage-btn">Manage security <ArrowUpRight className="w-3 h-3 ml-1" /></Button></Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="lg:col-span-8 grid sm:grid-cols-3 gap-6">
          {[
            { label: "Total records", value: records.length, icon: FileText, color: "text-blue-600" },
            { label: "Active shares", value: activeShares.length, icon: Share2, color: "text-emerald-600" },
            { label: "Recent events", value: audit.length, icon: Activity, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
              <div className="mt-1 text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Records */}
        <div className="lg:col-span-8 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent records</h2>
            <Link to="/records" className="text-sm text-teal-700 dark:text-teal-400 hover:underline" data-testid="view-all-records-btn">View all</Link>
          </div>
          <div className="mt-4 space-y-2">
            {records.slice(0, 6).map((r) => (
              <div key={r.id} data-testid={`dash-record-${r.id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{r.title}</div>
                  <div className="text-xs text-slate-500 truncate">{r.doctor || "—"} · {timeAgo(r.created_at)}</div>
                </div>
                <Badge variant="outline" className={catColor[r.category] || catColor.Other}>{r.category}</Badge>
              </div>
            ))}
            {records.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="mt-3 text-slate-500">No records yet</p>
                <Button onClick={() => setUploadOpen(true)} variant="outline" size="sm" className="mt-3" data-testid="empty-upload-btn">Upload the first one</Button>
              </div>
            )}
          </div>
        </div>

        {/* Active Shares */}
        <div className="lg:col-span-4 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active shares</h2>
            <Link to="/shares" className="text-sm text-teal-700 dark:text-teal-400 hover:underline">Manage</Link>
          </div>
          <div className="mt-4 space-y-3">
            {activeShares.slice(0, 4).map((s) => (
              <div key={s.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{s.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.record_ids.length} records · Expires {new Date(s.expires_at).toLocaleDateString()}</div>
                  </div>
                  {s.has_pin && <Badge variant="secondary" className="text-xs">PIN</Badge>}
                </div>
              </div>
            ))}
            {activeShares.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">No active share links</div>
            )}
          </div>
        </div>

        {/* Health snapshot */}
        <div className="lg:col-span-8 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Health snapshot</h2>
            <Link to="/health" className="text-sm text-teal-700 dark:text-teal-400 hover:underline">Edit</Link>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
              <div className="text-xs uppercase tracking-wider text-red-700 dark:text-red-300 font-medium">Blood group</div>
              <div className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300 font-mono">{health.blood_group || "—"}</div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
              <div className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Allergies</div>
              <div className="mt-2 text-sm text-amber-900 dark:text-amber-200">{(health.allergies || []).slice(0, 3).join(", ") || "None recorded"}</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1"><HeartPulse className="w-3 h-3" />Conditions</div>
              <div className="mt-2 text-sm text-slate-800 dark:text-slate-200">{(health.conditions || []).slice(0, 3).join(", ") || "None recorded"}</div>
            </div>
            <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40">
              <div className="text-xs uppercase tracking-wider text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1"><Pill className="w-3 h-3" />Medications</div>
              <div className="mt-2 text-sm text-teal-900 dark:text-teal-200">{(health.medications || []).slice(0, 3).join(", ") || "None recorded"}</div>
            </div>
          </div>
        </div>

        {/* Audit mini */}
        <div className="lg:col-span-4 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Activity</h2>
            <Link to="/audit" className="text-sm text-teal-700 dark:text-teal-400 hover:underline">Full log</Link>
          </div>
          <div className="mt-4 space-y-3">
            {audit.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900 dark:text-white truncate">{a.action.replace(/_/g, " ").replace(/\./g, " · ")}</div>
                  <div className="text-xs text-slate-500">{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
            {audit.length === 0 && <div className="text-sm text-slate-500 text-center py-6">No activity yet</div>}
          </div>
        </div>
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={load} />
    </div>
  );
}
