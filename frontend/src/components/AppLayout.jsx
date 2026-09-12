import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, HeartPulse, Share2, ScrollText, Settings as Gear, LogOut, ShieldCheck, ChevronDown, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProfiles } from "@/context/ProfileContext";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tid: "nav-dashboard" },
  { to: "/records", label: "Records", icon: FileText, tid: "nav-records" },
  { to: "/health", label: "Health Profile", icon: HeartPulse, tid: "nav-health" },
  { to: "/shares", label: "Share Links", icon: Share2, tid: "nav-shares" },
  { to: "/audit", label: "Audit Log", icon: ScrollText, tid: "nav-audit" },
  { to: "/settings", label: "Settings", icon: Gear, tid: "nav-settings" },
];

function initials(name) {
  return (name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { profiles, active, setActiveId } = useProfiles();
  const nav_go = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">MediPassport</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon, tid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={tid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger data-testid="user-menu-trigger" className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Avatar className="w-8 h-8"><AvatarFallback className="bg-teal-600 text-white text-xs">{initials(user?.name)}</AvatarFallback></Avatar>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => nav_go("/settings")} data-testid="menu-settings">
                <Gear className="w-4 h-4 mr-2" />Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await logout(); nav_go("/"); }} data-testid="menu-logout" className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">MediPassport</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {active && (
              <DropdownMenu>
                <DropdownMenuTrigger data-testid="profile-switcher" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{active.name}</span>
                  <Badge variant="secondary" className="capitalize">{active.relationship}</Badge>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
                  {profiles.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      data-testid={`switch-profile-${p.id}`}
                      onClick={() => setActiveId(p.id)}
                      className={p.id === active.id ? "bg-teal-50 dark:bg-teal-950/40" : ""}
                    >
                      <Avatar className="w-7 h-7 mr-2"><AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-xs">{initials(p.name)}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{p.relationship}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => nav_go("/settings?tab=profiles")} data-testid="manage-profiles">
                    Manage profiles
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
