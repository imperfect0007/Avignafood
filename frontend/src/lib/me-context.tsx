import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearAuth, getToken, type Me } from "@/lib/api";

type MeCtx = { me: Me | null; loading: boolean };

const Ctx = createContext<MeCtx>({ me: null, loading: true });

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    api<Me>("/api/v1/auth/me")
      .then(setMe)
      .catch(() => {
        clearAuth();
        setMe(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return <Ctx.Provider value={{ me, loading }}>{children}</Ctx.Provider>;
}

export const useMe = () => useContext(Ctx);
