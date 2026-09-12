import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API } from "@/lib/api";
import axios from "axios";
import { ShieldCheck, Lock, Clock, FileText, Download, Droplet, AlertTriangle, HeartPulse, Pill, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

export default function PublicShare() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: null, pinRequired: false, label: "", data: null });
  const [pin, setPin] = useState("");

  const fetch_share = async (withPin) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const url = `${API}/public/share/${token}${withPin ? `?pin=${withPin}` : ""}`;
      const { data } = await axios.get(url);
      if (data?.pin_required) {
        setState({ loading: false, pinRequired: true, label: data.label, data: null, error: null });
      } else {
        setState({ loading: false, pinRequired: false, label: data.label, data, error: null });
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 410) setState({ loading: false, error: "This share link has expired or been revoked.", data: null, pinRequired: false });
      else if (status === 401) { toast.error("Invalid PIN"); setState((s) => ({ ...s, loading: false })); }
      else setState({ loading: false, error: "Share not found.", data: null, pinRequired: false });
    }
  };

  useEffect(() => { fetch_share(); /* eslint-disable-next-line */ }, [token]);

  const download = async (rid, filename) => {
    try {
      const url = `${API}/public/share/${token}/record/${rid}${pin ? `?pin=${pin}` : ""}`;
      const resp = await axios.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(resp.data);
      const a = document.createElement("a"); a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch { toast.error("Download failed"); }
  };

  if (state.loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading share…</div>;

  if (state.error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="p-10 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto"><Lock className="w-8 h-8 text-red-600" /></div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Link unavailable</h1>
        <p className="mt-2 text-slate-500">{state.error}</p>
      </Card>
    </div>
  );

  if (state.pinRequired) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="p-10 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto pulse-ring"><Lock className="w-8 h-8 text-teal-700" /></div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Enter PIN</h1>
          <p className="mt-2 text-slate-500">This share is PIN-protected. Ask the patient for the 4-digit code.</p>
        </div>
        <div className="mt-8 flex justify-center">
          <InputOTP maxLength={4} value={pin} onChange={setPin} data-testid="public-pin-input">
            <InputOTPGroup>{[0,1,2,3].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
        </div>
        <Button onClick={() => fetch_share(pin)} disabled={pin.length !== 4} className="mt-6 w-full bg-teal-700 hover:bg-teal-800 text-white" data-testid="public-pin-submit">Unlock</Button>
      </Card>
    </div>
  );

  const { data } = state;
  const h = data.profile?.health || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-white" /></div>
            <div>
              <div className="font-bold text-slate-900">MediPassport</div>
              <div className="text-xs text-slate-500">Read-only shared view</div>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200"><Clock className="w-3 h-3 mr-1" />Expires {new Date(data.expires_at).toLocaleString()}</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-teal-700 font-medium">Patient</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{data.profile?.name}</h1>
          <p className="text-sm text-slate-500 capitalize mt-1">{data.profile?.relationship}</p>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
              <div className="text-xs uppercase tracking-wider text-red-700 flex items-center gap-1 font-medium"><Droplet className="w-3 h-3" />Blood group</div>
              <div className="mt-2 text-2xl font-bold text-red-700 font-mono">{h.blood_group || "—"}</div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
              <div className="text-xs uppercase tracking-wider text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Allergies</div>
              <div className="mt-2 text-sm text-amber-900">{(h.allergies || []).join(", ") || "None"}</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-100 border border-slate-200">
              <div className="text-xs uppercase tracking-wider text-slate-700 font-medium flex items-center gap-1"><HeartPulse className="w-3 h-3" />Conditions</div>
              <div className="mt-2 text-sm text-slate-800">{(h.conditions || []).join(", ") || "None"}</div>
            </div>
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-100">
              <div className="text-xs uppercase tracking-wider text-teal-700 font-medium flex items-center gap-1"><Pill className="w-3 h-3" />Medications</div>
              <div className="mt-2 text-sm text-teal-900">{(h.medications || []).join(", ") || "None"}</div>
            </div>
          </div>
          {(h.emergency_contact_name || h.emergency_contact_phone) && (
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-3">
              <Phone className="w-4 h-4 text-blue-700" />
              <div className="text-sm text-blue-900"><span className="font-medium">Emergency:</span> {h.emergency_contact_name} · {h.emergency_contact_phone}</div>
            </div>
          )}
        </Card>

        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Shared records ({data.records.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {data.records.map((r) => (
              <Card key={r.id} className="p-5" data-testid={`shared-record-${r.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{r.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{r.doctor || "—"} · {r.hospital || "—"}</div>
                  </div>
                  <Badge variant="outline">{r.category}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="w-3 h-3" />{r.filename}
                  <span>·</span>{new Date(r.record_date).toLocaleDateString()}
                </div>
                <Button size="sm" onClick={() => download(r.id, r.filename)} className="mt-4 w-full bg-teal-700 hover:bg-teal-800 text-white" data-testid={`public-download-${r.id}`}>
                  <Download className="w-4 h-4 mr-2" />Download
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 py-8">Powered by MediPassport · Every view is logged and visible to the patient.</p>
      </main>
    </div>
  );
}
