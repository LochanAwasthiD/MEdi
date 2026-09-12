import { useEffect, useState } from "react";
import { api, apiErr, API } from "@/lib/api";
import { useProfiles } from "@/context/ProfileContext";
import { Search, FileText, Upload, Download, Trash2, Share2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import UploadDialog from "@/components/UploadDialog";
import ShareDialog from "@/components/ShareDialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const CATEGORIES = ["All", "Prescriptions", "Lab Reports", "Imaging", "Vaccinations", "Insurance", "Other"];

const catColor = {
  Prescriptions: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
  "Lab Reports": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900",
  Imaging: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-900",
  Vaccinations: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  Insurance: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  Other: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}

export default function Records() {
  const { active } = useProfiles();
  const [records, setRecords] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = async () => {
    if (!active) return;
    const params = new URLSearchParams({ profile_id: active.id });
    if (cat !== "All") params.set("category", cat);
    if (q) params.set("q", q);
    const { data } = await api.get(`/records?${params}`);
    setRecords(data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [active?.id, cat, q]);

  const toggle = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const download = async (r) => {
    try {
      const resp = await fetch(`${API}/records/${r.id}/download`, { credentials: "include" });
      if (!resp.ok) throw new Error("Failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = r.filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Download failed"); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/records/${id}`);
      toast.success("Record deleted");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div className="space-y-6" data-testid="records-page">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Vault</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">All records</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{records.length} record{records.length !== 1 ? "s" : ""} for {active?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button onClick={() => setShareOpen(true)} variant="outline" data-testid="share-selected-btn">
              <Share2 className="w-4 h-4 mr-2" />Share {selected.size} selected
            </Button>
          )}
          <Button onClick={() => setUploadOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="records-upload-btn">
            <Upload className="w-4 h-4 mr-2" />Upload
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search by title, doctor, hospital, tag…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="records-search" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} data-testid={`filter-${c.replace(/\s/g,'-')}`}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                cat === c
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400"
              }`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {records.length === 0 ? (
        <Card className="p-16 text-center border-dashed">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="mt-4 text-slate-500">No records match your filters</p>
          <Button onClick={() => setUploadOpen(true)} variant="outline" className="mt-4">Upload one</Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {records.map((r) => (
            <Card key={r.id} data-testid={`record-card-${r.id}`} className="p-5 hover:shadow-md hover:border-teal-300 transition-all group relative">
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="mt-1" data-testid={`select-record-${r.id}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{r.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{r.doctor || "—"} · {r.hospital || "—"}</div>
                  </div>
                </label>
                <Badge variant="outline" className={catColor[r.category] || catColor.Other}>{r.category}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <span>{new Date(r.record_date).toLocaleDateString()}</span>
                <span>·</span>
                <span>{fmtBytes(r.size || 0)}</span>
                <span>·</span>
                <span className="uppercase">{r.filename?.split(".").pop()}</span>
              </div>
              {r.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.tags.slice(0, 4).map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              )}
              <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button size="sm" variant="ghost" onClick={() => download(r)} data-testid={`download-btn-${r.id}`} className="flex-1"><Download className="w-3.5 h-3.5 mr-1.5" />Download</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`delete-btn-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete record?</AlertDialogTitle>
                      <AlertDialogDescription>{r.title} will be permanently removed from your vault.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => del(r.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={load} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} recordIds={[...selected]} onCreated={() => { setSelected(new Set()); }} />
    </div>
  );
}
