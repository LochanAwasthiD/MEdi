import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [need2fa, setNeed2fa] = useState(false);
  const [otp, setOtp] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = { email, password };
      if (need2fa) {
        if (useBackup) body.backup_code = backupCode;
        else body.totp_code = otp;
      }
      const { data } = await api.post("/auth/login", body);
      if (data?.twofa_required) {
        setNeed2fa(true);
        toast.info("Enter your 2FA code");
      } else {
        await refresh();
        toast.success("Welcome back");
        nav("/dashboard");
      }
    } catch (e) {
      toast.error(apiErr(e, "Login failed"));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950">
      <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-teal-800 to-slate-900">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative h-full flex flex-col p-12 text-white">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold">MediPassport</span>
          </Link>
          <div className="mt-auto max-w-md">
            <h2 className="text-3xl font-bold tracking-tight leading-tight">Welcome back.</h2>
            <p className="mt-3 text-teal-100 leading-relaxed">Your vault is exactly where you left it. Encrypted, private, ready.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Log in</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Access your health records vault</p>
          </div>

          {!need2fa && (
            <>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input id="password" data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
              </div>
            </>
          )}

          {need2fa && !useBackup && (
            <div>
              <Label>Enter 6-digit code from your authenticator app</Label>
              <div className="mt-3">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="login-otp">
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <button type="button" onClick={() => setUseBackup(true)} className="mt-3 text-sm text-teal-700 hover:underline" data-testid="use-backup-code-btn">Use a backup code instead</button>
            </div>
          )}

          {need2fa && useBackup && (
            <div>
              <Label htmlFor="backup">Backup code</Label>
              <Input id="backup" data-testid="login-backup-code" value={backupCode} onChange={(e) => setBackupCode(e.target.value.toUpperCase())} placeholder="ABCD1234" className="mt-1.5 font-mono uppercase" />
              <button type="button" onClick={() => setUseBackup(false)} className="mt-2 text-sm text-teal-700 hover:underline">Use authenticator instead</button>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-teal-700 hover:bg-teal-800 text-white h-11" data-testid="login-submit">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (need2fa ? "Verify & log in" : "Log in")}
          </Button>

          <p className="text-sm text-center text-slate-600 dark:text-slate-400">
            No account? <Link to="/signup" className="text-teal-700 dark:text-teal-400 font-medium hover:underline" data-testid="to-signup-link">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
