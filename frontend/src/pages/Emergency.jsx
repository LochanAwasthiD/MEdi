import { useEffect, useState, useRef } from "react";
import { api, apiErr } from "@/lib/api";
import { useProfiles } from "@/context/ProfileContext";
import { QrCode, Wallet, Copy, Check, Shield, RefreshCw, Loader2, Smartphone, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Simple QR code renderer via public API (no extra dep)
function QR({ text, size = 220 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=2`;
  return <img src={src} width={size} height={size} alt="QR" className="rounded-lg" />;
}

export default function Emergency() {
  const { active, reload } = useProfiles();
  const [token, setToken] = useState(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    // token is stored on profile — pull it via /profiles (already in context)
    if (active.emergency_token) {
      setToken(active.emergency_token);
      setUrl(`${window.location.origin}/emergency/${active.emergency_token}`);
    } else { setToken(null); setUrl(""); }
  }, [active?.id, active?.emergency_token]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/profiles/${active.id}/emergency-token`);
      setToken(data.token); setUrl(`${window.location.origin}/emergency/${data.token}`);
      await reload();
      toast.success("Emergency pass generated");
    } catch (e) { toast.error(apiErr(e)); }
    finally { setLoading(false); }
  };

  const revoke = async () => {
    setLoading(true);
    try {
      await api.delete(`/profiles/${active.id}/emergency-token`);
      setToken(null); setUrl("");
      await reload();
      toast.success("Emergency pass revoked");
    } catch (e) { toast.error(apiErr(e)); }
    finally { setLoading(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const printPass = () => window.print();

  const h = active?.health || {};

  return (
    <div className="space-y-6" data-testid="emergency-page">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Emergency</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Emergency access card</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">A tappable QR pass that first responders can read from a locked phone. No login. Every access logged.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Your emergency pass</h3>
          </div>
          {token ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Active</Badge>
                <span className="text-xs text-slate-500 font-mono">{token.slice(0, 12)}…</span>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={url} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono" data-testid="emergency-url" />
                <Button size="sm" onClick={copy} variant="outline" data-testid="emergency-copy">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={printPass} variant="outline" data-testid="emergency-print"><Wallet className="w-4 h-4 mr-2" />Print / Save to Wallet</Button>
                <Button onClick={revoke} variant="outline" className="text-red-600" data-testid="emergency-revoke"><Ban className="w-4 h-4 mr-2" />Revoke</Button>
              </div>
              <div className="text-xs text-slate-500 mt-4 space-y-1">
                <p><Smartphone className="w-3 h-3 inline mr-1" />On iPhone: open the printed pass, tap Share → Add to Wallet.</p>
                <p>NFC tags: encode <span className="font-mono">{url}</span> onto any NDEF tag for tap-to-read access.</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="mt-3 text-slate-500 text-sm">No emergency pass yet</p>
              <Button onClick={generate} disabled={loading} className="mt-4 bg-teal-700 hover:bg-teal-800 text-white" data-testid="emergency-generate">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                Generate pass
              </Button>
            </div>
          )}
        </Card>

        {/* Printable card */}
        {token && (
          <Card ref={cardRef} className="p-6 print:shadow-none print:border-2 print:border-black print:break-inside-avoid">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-red-700 font-bold">Emergency medical info</div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{active?.name}</h2>
                <p className="text-sm text-slate-500 capitalize">{active?.relationship} · DOB {active?.date_of_birth || "—"}</p>
              </div>
              <QR text={url} size={110} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                <div className="text-[10px] uppercase tracking-wider text-red-700 font-bold">Blood</div>
                <div className="text-2xl font-bold font-mono text-red-700">{h.blood_group || "—"}</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
                <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Allergies</div>
                <div className="text-xs text-amber-900 mt-1">{(h.allergies || []).join(", ") || "None"}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Conditions</div>
                <div className="text-xs text-slate-900 dark:text-white mt-1">{(h.conditions || []).join(", ") || "None"}</div>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-teal-700 font-bold">Medications</div>
                <div className="text-xs text-teal-900 mt-1">{(h.medications || []).join(", ") || "None"}</div>
              </div>
            </div>
            {(h.emergency_contact_name || h.emergency_contact_phone) && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">In case of emergency call</div>
                <div className="text-sm font-medium text-blue-900 mt-0.5">{h.emergency_contact_name} · {h.emergency_contact_phone}</div>
              </div>
            )}
            <div className="mt-4 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">Scan QR for full profile · MediPassport</div>
          </Card>
        )}
      </div>
    </div>
  );
}
