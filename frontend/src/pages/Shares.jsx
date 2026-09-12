import { useEffect, useState } from "react";
import { api, apiErr } from "@/lib/api";
import { Share2, Copy, Check, Ban, Clock, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

function timeLeft(iso) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  if (s <= 0) return "Expired";
  if (s < 3600) return `${Math.floor(s / 60)}m left`;
  if (s < 86400) return `${Math.floor(s / 3600)}h left`;
  return `${Math.floor(s / 86400)}d left`;
}

export default function Shares() {
  const [shares, setShares] = useState([]);
  const [copied, setCopied] = useState(null);

  const load = async () => {
    const { data } = await api.get("/shares");
    setShares(data);
  };
  useEffect(() => { load(); }, []);

  const revoke = async (id) => {
    try {
      await api.post(`/shares/${id}/revoke`);
      toast.success("Share revoked");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const copy = async (t, id) => {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${t}`);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6" data-testid="shares-page">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Share links</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Doctor share links</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Every link, every access. Revoke any time.</p>
      </div>

      {shares.length === 0 ? (
        <Card className="p-16 text-center border-dashed">
          <Share2 className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="mt-4 text-slate-500">You haven&apos;t created any share links yet</p>
          <p className="mt-1 text-xs text-slate-400">Head to Records, select some, and hit share.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shares.map((s) => (
            <Card key={s.id} data-testid={`share-item-${s.id}`} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-slate-900 dark:text-white">{s.label}</div>
                    {s.status === "active" && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Active</Badge>}
                    {s.status === "expired" && <Badge variant="secondary">Expired</Badge>}
                    {s.status === "revoked" && <Badge variant="destructive">Revoked</Badge>}
                    {s.has_pin && <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />PIN</Badge>}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                    <span>{s.record_ids.length} records</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.status === "active" ? timeLeft(s.expires_at) : new Date(s.expires_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{s.access_count} views</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {s.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copy(s.token, s.id)} data-testid={`copy-share-${s.id}`}>
                        {copied === s.id ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}Copy link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => revoke(s.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700" data-testid={`revoke-share-${s.id}`}>
                        <Ban className="w-4 h-4 mr-1" />Revoke
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
