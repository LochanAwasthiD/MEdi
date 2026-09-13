import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Records from "@/pages/Records";
import HealthProfile from "@/pages/HealthProfile";
import Shares from "@/pages/Shares";
import AuditLog from "@/pages/AuditLog";
import Settings from "@/pages/Settings";
import PublicShare from "@/pages/PublicShare";
import AIAssistant from "@/pages/AIAssistant";
import Vitals from "@/pages/Vitals";
import Emergency from "@/pages/Emergency";
import PublicEmergency from "@/pages/PublicEmergency";
import AppLayout from "@/components/AppLayout";

function Protected({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <Toaster position="top-right" richColors />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/share/:token" element={<PublicShare />} />
              <Route path="/emergency/:token" element={<PublicEmergency />} />
              <Route element={<Protected><AppLayout /></Protected>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/records" element={<Records />} />
                <Route path="/vitals" element={<Vitals />} />
                <Route path="/health" element={<HealthProfile />} />
                <Route path="/assistant" element={<AIAssistant />} />
                <Route path="/shares" element={<Shares />} />
                <Route path="/emergency" element={<Emergency />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
