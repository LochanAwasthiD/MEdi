import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search } from "lucide-react";

const actionColors = {
  "auth.login": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "auth.logout": "bg-slate-50 text-slate-700 border-slate-200",
  "auth.register": "bg-blue-50 text-blue-700 border-blue-200",
  "record.uploaded": "bg-teal-50 text-teal-700 border-teal-200",
  "record.downloaded": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "record.deleted": "bg-red-50 text-red-700 border-red-200",
  "share.created": "bg-purple-50 text-purple-700 border-purple-200",
  "share.accessed": "bg-amber-50 text-amber-700 border-amber-200",
  "share.revoked": "bg-red-50 text-red-700 border-red-200",
  "security.2fa_enabled": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "security.2fa_disabled": "bg-red-50 text-red-700 border-red-200",
  "security.session_revoked": "bg-amber-50 text-amber-700 border-amber-200",
  "profile.created": "bg-blue-50 text-blue-700 border-blue-200",
  "profile.deleted": "bg-red-50 text-red-700 border-red-200",
  "data.exported": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/audit?limit=200").then(r => setLogs(r.data)); }, []);

  const filtered = logs.filter((l) =>
    !q || l.action.toLowerCase().includes(q.toLowerCase()) ||
    (l.ip || "").includes(q) || (l.target || "").includes(q)
  );

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Audit trail</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Activity log</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Every login, upload, share, and access — recorded and searchable.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Filter events…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="audit-search" />
      </div>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <ScrollText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="mt-4 text-slate-500">No events yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((l) => (
              <div key={l.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors" data-testid={`audit-row-${l.id}`}>
                <Badge variant="outline" className={`${actionColors[l.action] || "bg-slate-50 text-slate-700 border-slate-200"} font-mono text-xs`}>{l.action}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-900 dark:text-white truncate">{l.target || "—"}</div>
                  <div className="text-xs text-slate-500 truncate">{l.ip || "—"} · {l.user_agent?.slice(0, 60) || "—"}</div>
                </div>
                <div className="text-xs text-slate-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
