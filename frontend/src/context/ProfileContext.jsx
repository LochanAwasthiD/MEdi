import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ProfileCtx = createContext(null);

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await api.get("/profiles");
    setProfiles(data);
    if (data.length && !data.find((p) => p.id === activeId)) {
      const self = data.find((p) => p.relationship === "self") || data[0];
      setActiveId(self.id);
    }
  }, [user, activeId]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const active = profiles.find((p) => p.id === activeId) || null;

  return (
    <ProfileCtx.Provider value={{ profiles, active, setActiveId, reload: load }}>
      {children}
    </ProfileCtx.Provider>
  );
}

export const useProfiles = () => useContext(ProfileCtx);
