import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, Check } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Signup() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      await refresh();
      toast.success("Account created");
      nav("/dashboard");
    } catch (e) {
      toast.error(apiErr(e, "Signup failed"));
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
          <div className="mt-auto max-w-md space-y-6">
            <h2 className="text-3xl font-bold leading-tight tracking-tight">Start your health record wallet.</h2>
            <ul className="space-y-3 text-teal-100">
              {["Free forever for personal use", "Encrypted vault, TOTP 2FA ready", "Manage family under one account", "Time-limited doctor share links"].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-teal-300" /><span>{t}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create your account</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Takes about 30 seconds</p>
          </div>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" data-testid="signup-name" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" data-testid="signup-email" type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" data-testid="signup-password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="mt-1.5" />
            <p className="text-xs text-slate-500 mt-1.5">Minimum 8 characters. Enable 2FA later in Settings.</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-teal-700 hover:bg-teal-800 text-white h-11" data-testid="signup-submit">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
          </Button>
          <p className="text-sm text-center text-slate-600 dark:text-slate-400">
            Already have one? <Link to="/login" className="text-teal-700 dark:text-teal-400 font-medium hover:underline" data-testid="to-login-link">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
