import { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useProfiles } from "@/context/ProfileContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ShareDialog({ open, onOpenChange, recordIds = [], onCreated }) {
  const { active } = useProfiles();
  const [hours, setHours] = useState("24");
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [label, setLabel] = useState("");
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!recordIds.length) return toast.error("Select records to share");
    if (usePin && !/^\d{4}$/.test(pin)) return toast.error("PIN must be 4 digits");
    setLoading(true);
    try {
      const { data } = await api.post("/shares", {
        profile_id: active.id,
        record_ids: recordIds,
        expires_in_hours: parseInt(hours),
        pin: usePin ? pin : null,
        label: label || null,
      });
      const url = `${window.location.origin}/share/${data.token}`;
      setLink(url);
      onCreated?.(data);
    } catch (e) {
      toast.error(apiErr(e, "Failed to create link"));
    } finally { setLoading(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setLink(null); setPin(""); setUsePin(false); setLabel(""); setHours("24");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{link ? "Share link ready" : "Create share link"}</DialogTitle>
          <DialogDescription>
            {link ? "Send this URL to your doctor. Revoke it any time." : `Sharing ${recordIds.length} record${recordIds.length !== 1 ? "s" : ""} securely.`}
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
              <div className="flex items-center gap-2">
                <Input readOnly value={link} className="font-mono text-xs bg-white dark:bg-slate-900" data-testid="share-link-url" />
                <Button size="sm" onClick={copy} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="copy-link-btn">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {usePin && <p className="mt-3 text-xs text-teal-800 dark:text-teal-200">PIN: <span className="font-mono font-bold">{pin}</span> — share separately from the link.</p>}
            </div>
            <DialogFooter>
              <Button onClick={() => { onOpenChange(false); reset(); }} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="share-done-btn">Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Label (optional)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Dr. Smith - annual checkup" className="mt-1.5" data-testid="share-label" />
            </div>
            <div>
              <Label>Expires in</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="mt-1.5" data-testid="share-expiry"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                  <SelectItem value="720">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Require 4-digit PIN</div>
                <p className="text-xs text-slate-500">Extra layer of protection</p>
              </div>
              <Switch checked={usePin} onCheckedChange={setUsePin} data-testid="share-pin-toggle" />
            </div>
            {usePin && (
              <Input type="text" pattern="[0-9]{4}" maxLength={4} inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g,""))} placeholder="0000" className="font-mono text-center text-2xl tracking-widest" data-testid="share-pin-input" />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !recordIds.length} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="create-share-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                Generate link
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
