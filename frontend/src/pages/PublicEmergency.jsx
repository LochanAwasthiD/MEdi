import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { ShieldAlert, Droplet, AlertTriangle, HeartPulse, Pill, Phone, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const VITAL_LABELS = {
  heart_rate: "Heart rate",
  blood_pressure: "Blood pressure",
  spo2: "SpO₂",
  temperature: "Temperature",
  weight: "Weight",
  glucose: "Glucose",
};

export default function PublicEmergency() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    axios.get(`${API}/public/emergency/${token}`)
      .then((r) => setData(r.data))
      .catch(() => setErr("This emergency pass is not available."));
  }, [token]);

  if (err) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <Card className="p-10 text-center max-w-md">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Pass unavailable</h1>
        <p className="mt-2 text-slate-500">{err}</p>
      </Card>
    </div>
  );
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading emergency profile…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Emergency banner */}
      <div className="bg-red-600 text-white text-center py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2">
        <ShieldAlert className="w-4 h-4" />Emergency medical profile
      </div>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-red-700 font-bold">Patient</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{data.name}</h1>
          <div className="mt-1 text-sm text-slate-500 capitalize">{data.relationship} · DOB {data.date_of_birth || "—"}</div>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-5 border-l-4 border-l-red-600">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-red-700 font-bold"><Droplet className="w-3 h-3" />Blood group</div>
            <div className="mt-2 text-5xl font-bold text-red-700 font-mono">{data.blood_group || "—"}</div>
          </Card>
          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 font-bold"><AlertTriangle className="w-3 h-3" />Allergies</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(data.allergies || []).length ? data.allergies.map((a) => <Badge key={a} className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200">{a}</Badge>) : <span className="text-slate-400 text-sm">None recorded</span>}
            </div>
          </Card>
          <Card className="p-5 sm:col-span-2 border-l-4 border-l-slate-600">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-700 font-bold"><HeartPulse className="w-3 h-3" />Conditions</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(data.conditions || []).length ? data.conditions.map((a) => <Badge key={a} variant="secondary">{a}</Badge>) : <span className="text-slate-400 text-sm">None recorded</span>}
            </div>
          </Card>
          <Card className="p-5 sm:col-span-2 border-l-4 border-l-teal-600">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-teal-700 font-bold"><Pill className="w-3 h-3" />Current medications</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(data.medications || []).length ? data.medications.map((a) => <Badge key={a} className="bg-teal-100 text-teal-900 hover:bg-teal-100 border-teal-200">{a}</Badge>) : <span className="text-slate-400 text-sm">None recorded</span>}
            </div>
          </Card>
        </div>

        {(data.emergency_contact_name || data.emergency_contact_phone) && (
          <Card className="p-5 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-blue-700" />
              <div>
                <div className="text-xs uppercase tracking-wider text-blue-700 font-bold">Emergency contact</div>
                <div className="text-lg font-semibold text-blue-900">{data.emergency_contact_name}</div>
                <a href={`tel:${data.emergency_contact_phone}`} className="text-blue-700 hover:underline text-sm">{data.emergency_contact_phone}</a>
              </div>
            </div>
          </Card>
        )}

        {data.latest_vitals && Object.keys(data.latest_vitals).length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-700 font-bold mb-3"><Activity className="w-3 h-3" />Latest vitals</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(data.latest_vitals).map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">{VITAL_LABELS[k]}</div>
                  <div className="text-lg font-mono font-bold text-slate-900">
                    {v.value}{v.value2 ? `/${v.value2}` : ""} <span className="text-xs font-normal">{v.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{new Date(v.recorded_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.notes && (
          <Card className="p-5"><div className="text-xs uppercase tracking-wider text-slate-700 font-bold mb-2">Notes</div><p className="text-sm text-slate-700">{data.notes}</p></Card>
        )}

        <p className="text-center text-xs text-slate-400 pt-6 pb-8">Powered by MediPassport · Access is logged and audited.</p>
      </main>
    </div>
  );
}
