import { useEffect, useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useProfiles } from "@/context/ProfileContext";
import { Heart, Activity, Thermometer, Droplet, Scale, TrendingUp, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

const VITAL_META = {
  heart_rate:      { label: "Heart rate", icon: Heart, unit: "bpm", color: "#dc2626" },
  blood_pressure:  { label: "Blood pressure", icon: Activity, unit: "mmHg", color: "#2563eb", dual: true },
  spo2:            { label: "SpO₂", icon: Droplet, unit: "%", color: "#0891b2" },
  temperature:     { label: "Temperature", icon: Thermometer, unit: "°C", color: "#ea580c" },
  weight:          { label: "Weight", icon: Scale, unit: "kg", color: "#7c3aed" },
  glucose:         { label: "Glucose", icon: TrendingUp, unit: "mg/dL", color: "#059669" },
};

export default function Vitals() {
  const { active } = useProfiles();
  const [all, setAll] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "heart_rate", value: "", value2: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!active) return;
    const { data } = await api.get(`/vitals?profile_id=${active.id}&limit=500`);
    setAll(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [active?.id]);

  const add = async () => {
    if (!form.value) return toast.error("Value required");
    setSaving(true);
    try {
      const meta = VITAL_META[form.type];
      await api.post("/vitals", {
        profile_id: active.id, type: form.type,
        value: parseFloat(form.value),
        value2: meta.dual ? parseFloat(form.value2) : null,
        unit: meta.unit, notes: form.notes || null,
      });
      toast.success("Vital recorded");
      setShowAdd(false); setForm({ type: "heart_rate", value: "", value2: "", notes: "" });
      load();
    } catch (e) { toast.error(apiErr(e)); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    try { await api.delete(`/vitals/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const groups = Object.keys(VITAL_META).reduce((acc, k) => {
    acc[k] = all.filter((v) => v.type === k).sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="vitals-page">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Timeline</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Vitals</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Time-series health data for {active?.name}.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="add-vital-btn">
          <Plus className="w-4 h-4 mr-2" />Record vital
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(VITAL_META).map(([key, meta]) => {
          const rows = groups[key];
          const latest = rows[rows.length - 1];
          const chartData = rows.map((r) => ({
            time: new Date(r.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            value: r.value, value2: r.value2,
          }));
          const Icon = meta.icon;
          return (
            <Card key={key} className="p-6" data-testid={`vital-card-${key}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{meta.label}</div>
                    {latest ? (
                      <div className="text-xs text-slate-500">
                        Latest: <span className="font-mono font-medium text-slate-900 dark:text-white">
                          {latest.value}{meta.dual && latest.value2 ? `/${latest.value2}` : ""} {meta.unit}
                        </span> · {new Date(latest.recorded_at).toLocaleDateString()}
                      </div>
                    ) : <div className="text-xs text-slate-400">No data</div>}
                  </div>
                </div>
              </div>
              {chartData.length > 1 ? (
                <div className="mt-4 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} dot={{ r: 3 }} />
                      {meta.dual && <Line type="monotone" dataKey="value2" stroke={meta.color} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 h-32 flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Record at least 2 entries to see a trend
                </div>
              )}
              {rows.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 max-h-24 overflow-y-auto scroll-thin space-y-1">
                  {rows.slice(-5).reverse().map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs group">
                      <span className="text-slate-500">{new Date(r.recorded_at).toLocaleString()}</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {r.value}{r.value2 ? `/${r.value2}` : ""} {r.unit}
                      </span>
                      <button onClick={() => del(r.id)} className="opacity-0 group-hover:opacity-100 text-red-500" data-testid={`del-vital-${r.id}`}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record a vital</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger className="mt-1.5" data-testid="vital-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VITAL_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label} ({m.unit})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{VITAL_META[form.type].dual ? "Systolic" : "Value"} ({VITAL_META[form.type].unit})</Label>
                <Input type="number" step="any" value={form.value} onChange={(e) => setForm({...form, value: e.target.value})} className="mt-1.5" data-testid="vital-value" />
              </div>
              {VITAL_META[form.type].dual && (
                <div>
                  <Label>Diastolic ({VITAL_META[form.type].unit})</Label>
                  <Input type="number" step="any" value={form.value2} onChange={(e) => setForm({...form, value2: e.target.value})} className="mt-1.5" data-testid="vital-value2" />
                </div>
              )}
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="mt-1.5" data-testid="vital-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={add} disabled={saving} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="save-vital-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
