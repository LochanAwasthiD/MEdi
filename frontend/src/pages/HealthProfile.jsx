import { useEffect, useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useProfiles } from "@/context/ProfileContext";
import { HeartPulse, Save, Plus, X, Loader2, Droplet, AlertTriangle, Pill, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BLOODS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

function TagField({ label, values, setValues, placeholder, testid, color = "slate" }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) setValues([...values, v]);
    setInput("");
  };
  const remove = (v) => setValues(values.filter((x) => x !== v));
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} data-testid={testid} />
        <Button type="button" onClick={add} variant="outline" data-testid={`${testid}-add`}><Plus className="w-4 h-4" /></Button>
      </div>
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <Badge key={v} variant="outline" className={`bg-${color}-50 text-${color}-700 border-${color}-200 dark:bg-${color}-950/40 dark:text-${color}-300 dark:border-${color}-900 pr-1`}>
              {v}<button type="button" onClick={() => remove(v)} className="ml-1.5 hover:text-red-600"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HealthProfile() {
  const { active, reload } = useProfiles();
  const [health, setHealth] = useState({
    blood_group: "", allergies: [], conditions: [], medications: [],
    emergency_contact_name: "", emergency_contact_phone: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (active) setHealth({
      blood_group: active.health?.blood_group || "",
      allergies: active.health?.allergies || [],
      conditions: active.health?.conditions || [],
      medications: active.health?.medications || [],
      emergency_contact_name: active.health?.emergency_contact_name || "",
      emergency_contact_phone: active.health?.emergency_contact_phone || "",
      notes: active.health?.notes || "",
    });
  }, [active?.id]);

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await api.post(`/profiles/${active.id}/health`, {
        ...health, blood_group: health.blood_group || null,
      });
      await reload();
      toast.success("Health profile updated");
    } catch (e) { toast.error(apiErr(e)); }
    finally { setSaving(false); }
  };

  if (!active) return null;

  return (
    <div className="space-y-6" data-testid="health-page">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Health profile</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{active.name}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Vital info that first responders need at a glance.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-4">
            <Droplet className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Blood group</h3>
          </div>
          <Select value={health.blood_group} onValueChange={(v) => setHealth({...health, blood_group: v})}>
            <SelectTrigger data-testid="blood-group"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {BLOODS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          {health.blood_group && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl text-center border border-red-200 dark:border-red-900">
              <div className="text-4xl font-bold text-red-700 dark:text-red-300 font-mono">{health.blood_group}</div>
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Allergies</h3>
          </div>
          <TagField label="Add allergy" values={health.allergies}
            setValues={(v) => setHealth({...health, allergies: v})}
            placeholder="e.g. Penicillin" testid="allergy-input" color="amber" />
        </Card>

        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <HeartPulse className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Chronic conditions</h3>
          </div>
          <TagField label="Add condition" values={health.conditions}
            setValues={(v) => setHealth({...health, conditions: v})}
            placeholder="e.g. Asthma" testid="condition-input" color="slate" />
        </Card>

        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Current medications</h3>
          </div>
          <TagField label="Add medication" values={health.medications}
            setValues={(v) => setHealth({...health, medications: v})}
            placeholder="e.g. Metformin 500mg twice daily" testid="medication-input" color="teal" />
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Emergency contact</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" value={health.emergency_contact_name}
                onChange={(e) => setHealth({...health, emergency_contact_name: e.target.value})}
                data-testid="ec-name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1.5" value={health.emergency_contact_phone}
                onChange={(e) => setHealth({...health, emergency_contact_phone: e.target.value})}
                data-testid="ec-phone" />
            </div>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-1">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Notes</h3>
          <Textarea rows={4} value={health.notes}
            onChange={(e) => setHealth({...health, notes: e.target.value})}
            data-testid="health-notes" placeholder="Additional info…" />
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="save-health-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save health profile
        </Button>
      </div>
    </div>
  );
}
