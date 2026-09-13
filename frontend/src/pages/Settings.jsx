import { useEffect, useState } from "react";
import { api, apiErr, API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useProfiles } from "@/context/ProfileContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ShieldCheck, ShieldAlert, Monitor, LogOut, Download, Copy, Check, Plus, Trash2, UserPlus, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";

function TwoFASetup({ onDone }) {
  const [step, setStep] = useState("setup");
  const [data, setData] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const begin = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/2fa/setup");
      setData(data); setStep("scan");
    } catch (e) { toast.error(apiErr(e)); } finally { setLoading(false); }
  };
  const verify = async () => {
    setLoading(true);
    try {
      await api.post("/auth/2fa/enable", { totp_code: code });
      toast.success("2FA enabled");
      onDone();
    } catch (e) { toast.error(apiErr(e)); } finally { setLoading(false); }
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(data.backup_codes.join("\n"));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (step === "setup") return (
    <Button onClick={begin} disabled={loading} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="enable-2fa-btn">
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}Enable 2FA
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-2">1. Scan with authenticator</h4>
          <img src={data.qr_code} alt="QR" className="w-48 h-48 border rounded-lg bg-white p-2" data-testid="totp-qr" />
          <p className="text-xs text-slate-500 mt-2">Or enter secret manually: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{data.secret}</code></p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">2. Save backup codes</h4>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg font-mono text-sm space-y-1">
            {data.backup_codes.map((c) => <div key={c}>{c}</div>)}
          </div>
          <Button size="sm" variant="outline" onClick={copyCodes} className="mt-2" data-testid="copy-backup-codes">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}Copy all
          </Button>
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2">3. Enter code to confirm</h4>
        <InputOTP maxLength={6} value={code} onChange={setCode} data-testid="verify-2fa-otp">
          <InputOTPGroup>{[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
        </InputOTP>
        <Button onClick={verify} disabled={loading || code.length !== 6} className="mt-4 bg-teal-700 hover:bg-teal-800 text-white" data-testid="confirm-2fa-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Confirm & enable
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const { profiles, reload } = useProfiles();
  const [sessions, setSessions] = useState([]);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [newProf, setNewProf] = useState({ name: "", relationship: "child", date_of_birth: "" });
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [pwToDisable, setPwToDisable] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [chain, setChain] = useState(null);

  const loadSessions = async () => {
    const { data } = await api.get("/sessions");
    setSessions(data);
  };
  useEffect(() => { loadSessions(); api.get("/solana/status").then(r => setChain(r.data)).catch(() => {}); }, []);

  const revokeSession = async (id) => {
    try { await api.delete(`/sessions/${id}`); toast.success("Device revoked"); loadSessions(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const revokeAll = async () => {
    try { await api.post("/sessions/revoke-all"); toast.success("All other devices signed out"); loadSessions(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const disable2FA = async () => {
    try {
      await api.post("/auth/2fa/disable", { password: pwToDisable });
      toast.success("2FA disabled");
      await refresh();
      setShowDisable(false); setPwToDisable("");
    } catch (e) { toast.error(apiErr(e)); }
  };

  const addProfile = async () => {
    if (!newProf.name) return toast.error("Name required");
    try {
      await api.post("/profiles", newProf);
      await reload();
      toast.success("Profile added");
      setShowAddProfile(false);
      setNewProf({ name: "", relationship: "child", date_of_birth: "" });
    } catch (e) { toast.error(apiErr(e)); }
  };

  const delProfile = async (id) => {
    try { await api.delete(`/profiles/${id}`); toast.success("Profile deleted"); await reload(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const exportZip = async () => {
    toast.info("Preparing export…");
    try {
      const resp = await fetch(`${API}/export`, { credentials: "include" });
      if (!resp.ok) throw new Error();
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `medipassport-export-${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Export downloaded");
    } catch { toast.error("Export failed"); }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
      </div>

      <Tabs defaultValue="security">
        <TabsList className="grid grid-cols-5 max-w-2xl">
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="devices" data-testid="tab-devices">Devices</TabsTrigger>
          <TabsTrigger value="profiles" data-testid="tab-profiles">Profiles</TabsTrigger>
          <TabsTrigger value="chain" data-testid="tab-chain">Blockchain</TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4 mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {user?.twofa_enabled
                  ? <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-emerald-600" /></div>
                  : <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center"><ShieldAlert className="w-6 h-6 text-amber-600" /></div>}
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Two-factor authentication</div>
                  <div className="text-sm text-slate-500">{user?.twofa_enabled ? "Active — TOTP required at login" : "Add a second layer with an authenticator app"}</div>
                </div>
              </div>
              {user?.twofa_enabled ? (
                <Button variant="outline" onClick={() => setShowDisable(true)} className="text-red-600 hover:text-red-700" data-testid="disable-2fa-btn">Disable</Button>
              ) : !showTwoFA ? (
                <Button onClick={() => setShowTwoFA(true)} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="setup-2fa-btn">Set up</Button>
              ) : null}
            </div>
            {showTwoFA && !user?.twofa_enabled && (
              <div className="mt-6 pt-6 border-t">
                <TwoFASetup onDone={async () => { setShowTwoFA(false); await refresh(); }} />
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Account details</div>
                <div className="text-sm text-slate-500">{user?.email}</div>
              </div>
              <Button variant="outline" onClick={logout} data-testid="logout-btn"><LogOut className="w-4 h-4 mr-2" />Sign out</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-3 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Active devices with vault access</p>
            <Button variant="outline" size="sm" onClick={revokeAll} data-testid="revoke-all-btn">Sign out everywhere else</Button>
          </div>
          {sessions.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between" data-testid={`session-${s.id}`}>
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-slate-500" />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {(s.user_agent || "Unknown device").slice(0, 60)}
                    {s.current && <Badge className="ml-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">This device</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{s.ip || "—"} · Last seen {new Date(s.last_seen).toLocaleString()}</div>
                </div>
              </div>
              {!s.current && <Button size="sm" variant="outline" onClick={() => revokeSession(s.id)} className="text-red-600" data-testid={`revoke-session-${s.id}`}>Revoke</Button>}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="profiles" className="space-y-3 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Manage self and dependent profiles</p>
            <Button size="sm" onClick={() => setShowAddProfile(true)} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="add-profile-btn"><UserPlus className="w-4 h-4 mr-2" />Add profile</Button>
          </div>
          {profiles.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between" data-testid={`profile-${p.id}`}>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                <div className="text-xs text-slate-500 capitalize">{p.relationship} · {p.date_of_birth || "DOB not set"}</div>
              </div>
              {p.relationship !== "self" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-600" data-testid={`del-profile-${p.id}`}><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete profile?</AlertDialogTitle><AlertDialogDescription>All records for {p.name} will be removed too.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => delProfile(p.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="chain" className="mt-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0"><Link2 className="w-6 h-6 text-purple-700" /></div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-white">Tamper-proof record anchoring</div>
                <div className="text-sm text-slate-500 mt-1">SHA-256 hashes of your records are anchored to Solana devnet as memo transactions — anyone can verify a record hasn&apos;t been altered.</div>
                {chain?.configured ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-slate-500">Anchor account (devnet)</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 rounded px-2 py-1.5 font-mono truncate">{chain.pubkey}</code>
                      <a href={`https://explorer.solana.com/address/${chain.pubkey}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-xs text-teal-700 hover:underline whitespace-nowrap">View on Explorer</a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      Balance: <span className="font-mono font-medium text-slate-900 dark:text-white">{chain.balance_sol?.toFixed(4) ?? "—"} SOL</span>
                      {chain.balance_sol < 0.001 && (
                        <a href={`https://faucet.solana.com/?address=${chain.pubkey}`} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">Fund via faucet ↗</a>
                      )}
                    </div>
                  </div>
                ) : <div className="mt-3 text-sm text-amber-700">Blockchain verification not configured on this backend.</div>}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Export everything</div>
                <div className="text-sm text-slate-500 mt-1">Download all profiles, health data and record files as a single ZIP.</div>
              </div>
              <Button onClick={exportZip} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="export-data-btn"><Download className="w-4 h-4 mr-2" />Export ZIP</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add profile dialog */}
      <Dialog open={showAddProfile} onOpenChange={setShowAddProfile}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add profile</DialogTitle><DialogDescription>Manage records for a family member</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input className="mt-1.5" value={newProf.name} onChange={(e) => setNewProf({...newProf, name: e.target.value})} data-testid="new-profile-name" /></div>
            <div><Label>Relationship</Label>
              <Select value={newProf.relationship} onValueChange={(v) => setNewProf({...newProf, relationship: v})}>
                <SelectTrigger className="mt-1.5" data-testid="new-profile-rel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="daughter">Daughter</SelectItem>
                  <SelectItem value="son">Son</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date of birth</Label><Input type="date" className="mt-1.5" value={newProf.date_of_birth} onChange={(e) => setNewProf({...newProf, date_of_birth: e.target.value})} data-testid="new-profile-dob" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProfile(false)}>Cancel</Button>
            <Button onClick={addProfile} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="save-new-profile">Add profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent>
          <DialogHeader><DialogTitle>Disable 2FA</DialogTitle><DialogDescription>Enter your password to confirm.</DialogDescription></DialogHeader>
          <Input type="password" value={pwToDisable} onChange={(e) => setPwToDisable(e.target.value)} placeholder="Password" data-testid="disable-2fa-pw" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisable(false)}>Cancel</Button>
            <Button onClick={disable2FA} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-disable-2fa">Disable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
