import { Link } from "react-router-dom";
import { ShieldCheck, FileText, Share2, Lock, Fingerprint, KeyRound, ArrowRight, Users, ScrollText, HeartPulse, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Lock, title: "Zero-knowledge vault", desc: "Files encrypted at rest in isolated object storage. Only you unlock them." },
  { icon: Fingerprint, title: "TOTP 2FA + backup codes", desc: "Google Authenticator ready. Ten one-time codes for when you lose your phone." },
  { icon: Share2, title: "Doctor share links", desc: "Send a time-boxed, PIN-locked view. Revoke instantly, see every access." },
  { icon: Users, title: "Family under one account", desc: "Manage records for kids and aging parents without juggling logins." },
  { icon: ScrollText, title: "Audit trail, always on", desc: "Every login, view, share, and download recorded and searchable." },
  { icon: HeartPulse, title: "Emergency-ready profile", desc: "Blood group, allergies, meds — one tap for first responders." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">MediPassport</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-teal-700 dark:hover:text-teal-400">Features</a>
            <a href="#security" className="hover:text-teal-700 dark:hover:text-teal-400">Security</a>
            <a href="#how" className="hover:text-teal-700 dark:hover:text-teal-400">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" data-testid="landing-login-btn">Log in</Button></Link>
            <Link to="/signup"><Button className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="landing-signup-btn">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-70" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-teal-200/40 dark:bg-teal-900/20 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 fade-up">
            <Badge className="mb-6 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50">
              <Sparkles className="w-3 h-3 mr-1" /> Personal health record wallet
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.05]">
              Your medical records,<br/>
              <span className="text-teal-700 dark:text-teal-400">encrypted and in one place.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Upload prescriptions, lab reports and vaccination cards. Share a time-limited link with any doctor. Revoke it whenever you want. No hospital account required.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-teal-700 hover:bg-teal-800 text-white h-12 px-6" data-testid="hero-signup-btn">
                  Create free account <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-6" data-testid="hero-login-btn">
                  I already have one
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> AES-256 at rest</span>
              <span className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> TOTP 2FA</span>
              <span className="flex items-center gap-1.5"><ScrollText className="w-3.5 h-3.5" /> Full audit log</span>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-teal-900/10 ring-1 ring-slate-200 dark:ring-slate-800">
              <img alt="clinical dashboard preview" src="https://images.unsplash.com/photo-1666886573531-48d2e3c2b684?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjBtZWRpY2FsJTIwcmVjb3JkcyUyMGRhc2hib2FyZCUyMGhlYWx0aCUyMHBhdGllbnR8ZW58MHx8fHwxNzg5MjUyNDY5fDA&ixlib=rb-4.1.0&q=85" className="w-full h-[440px] object-cover" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center pulse-ring">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Vault secured</div>
                    <div className="text-xs text-slate-500">2FA active · 1 trusted device · 0 active shares</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Built for real life</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Everything a patient actually needs.</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">No provider portals, no fax machines. Just your records, on your terms.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-800 transition-all">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-teal-900 dark:from-slate-950 dark:to-teal-950 p-12 lg:p-16 text-white">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wider text-teal-300">Three steps</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Ready in five minutes.</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {[
              { n: "01", t: "Sign up + enable 2FA", d: "Email and password. Scan a QR into Authenticator. Save your ten backup codes." },
              { n: "02", t: "Upload & tag records", d: "PDFs, images, up to 25MB each. Sort by category, doctor, hospital, date." },
              { n: "03", t: "Share with any doctor", d: "Generate a link with a 4-digit PIN and an expiry. Revoke the moment they're done." },
            ].map((s) => (
              <div key={s.n} className="fade-up">
                <div className="text-teal-300 font-mono text-sm">{s.n}</div>
                <div className="mt-3 text-xl font-semibold">{s.t}</div>
                <p className="mt-2 text-slate-300 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-slate-500 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>MediPassport · v1.0</span>
          </div>
          <div>Built for people, not portals.</div>
        </div>
      </footer>
    </div>
  );
}
