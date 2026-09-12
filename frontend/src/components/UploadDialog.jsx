import { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useProfiles } from "@/context/ProfileContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Prescriptions", "Lab Reports", "Imaging", "Vaccinations", "Insurance", "Other"];

export default function UploadDialog({ open, onOpenChange, onUploaded }) {
  const { active, profiles } = useProfiles();
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: "", category: "Lab Reports", doctor: "", hospital: "",
    record_date: new Date().toISOString().slice(0, 10), tags: "", notes: "",
    profile_id: "",
  });
  const [loading, setLoading] = useState(false);

  const profileId = form.profile_id || active?.id;

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file first");
    if (file.size > 25 * 1024 * 1024) return toast.error("File exceeds 25MB");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("profile_id", profileId);
    fd.append("title", form.title || file.name);
    fd.append("category", form.category);
    fd.append("doctor", form.doctor);
    fd.append("hospital", form.hospital);
    fd.append("record_date", form.record_date);
    fd.append("tags", form.tags);
    fd.append("notes", form.notes);
    try {
      await api.post("/records", fd);
      toast.success("Record uploaded");
      onUploaded?.();
      onOpenChange(false);
      setFile(null);
      setForm({ ...form, title: "", doctor: "", hospital: "", tags: "", notes: "" });
    } catch (e) {
      toast.error(apiErr(e, "Upload failed"));
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload medical record</DialogTitle>
          <DialogDescription>PDF, JPG or PNG · Max 25MB</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Dropzone */}
          <label className="block cursor-pointer">
            <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files[0])} className="hidden" data-testid="upload-file-input" />
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-teal-500 dark:hover:border-teal-500 transition-colors">
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <UploadCloud className="w-6 h-6 text-teal-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</span>
                  <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }} className="text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 font-medium">Click to choose a file</p>
                  <p className="text-xs text-slate-500 mt-1">or drop it here</p>
                </>
              )}
            </div>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. CBC Blood Test" className="mt-1.5" data-testid="upload-title" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger className="mt-1.5" data-testid="upload-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profile</Label>
              <Select value={profileId} onValueChange={(v) => setForm({...form, profile_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="upload-profile"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.relationship})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Record date</Label>
              <Input type="date" value={form.record_date} onChange={(e) => setForm({...form, record_date: e.target.value})} className="mt-1.5" data-testid="upload-date" />
            </div>
            <div>
              <Label>Doctor</Label>
              <Input value={form.doctor} onChange={(e) => setForm({...form, doctor: e.target.value})} placeholder="Dr. Smith" className="mt-1.5" data-testid="upload-doctor" />
            </div>
            <div>
              <Label>Hospital / Clinic</Label>
              <Input value={form.hospital} onChange={(e) => setForm({...form, hospital: e.target.value})} className="mt-1.5" data-testid="upload-hospital" />
            </div>
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} placeholder="annual, fasting" className="mt-1.5" data-testid="upload-tags" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="mt-1.5" data-testid="upload-notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="upload-cancel-btn">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="upload-submit-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
