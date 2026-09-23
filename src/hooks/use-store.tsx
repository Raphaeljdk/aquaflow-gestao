"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import { makeDemoData } from "@/lib/demo-data";
import { applyMutation } from "@/lib/domain";
import type { AppData, Mutation, User } from "@/types";
export const DEMO = true;
type Store = {
  data: AppData | null;
  user: User | null;
  loading: boolean;
  error: string;
  busy: boolean;
  refresh: () => Promise<void>;
  mutate: (m: Mutation) => Promise<boolean>;
};
const Context = createContext<Store | null>(null);
const demoUser: User = {
  id: "demo-admin",
  name: "Administrador",
  email: "demo@aquaflow.local",
  role: "ADMIN",
};
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null),
    [user, setUser] = useState<User | null>(DEMO ? demoUser : null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const current = useRef<AppData | null>(null),
    lock = useRef(false);
  const refresh = useCallback(async () => {
    if (DEMO) {
      if (!current.current) {
        current.current = makeDemoData();
        setData(current.current);
      }
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/snapshot", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const body = await res.json();
      if (!res.ok) throw Error(body.error);
      current.current = body.data;
      setData(body.data);
      setUser(body.user);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    if (DEMO) return;
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const mutate = useCallback(
    async (m: Mutation) => {
      if (lock.current) return false;
      lock.current = true;
      setBusy(true);
      try {
        if (DEMO) {
          if (!current.current) throw Error("Aguarde o carregamento.");
          const next = applyMutation(current.current, m, demoUser);
          current.current = next;
          setData(next);
        } else {
          const res = await fetch(
            "/api/" + m.entity + (m.id ? "/" + m.id : ""),
            {
              method: m.method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(m.data ?? {}),
            },
          );
          const body = await res.json();
          if (!res.ok) throw Error(body.error);
          await refresh();
        }
        toast.success(
          m.method === "DELETE" ? "Registro removido." : "Alterações salvas.",
        );
        return true;
      } catch (e) {
        const err = e as { errors?: { message: string }[]; message?: string };
        toast.error(
          err.errors?.[0]?.message ?? err.message ?? "Não foi possível salvar.",
        );
        return false;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [refresh],
  );
  return (
    <Context.Provider
      value={{ data, user, loading, error, busy, refresh, mutate }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error("StoreProvider ausente");
  return value;
}
