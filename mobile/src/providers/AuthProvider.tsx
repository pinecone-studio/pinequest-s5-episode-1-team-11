import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthValue = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};
const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let receivedAuthEvent = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      // Keep this callback synchronous; no Supabase requests inside it.
      receivedAuthEvent = true;
      if (alive) {
        setSession(next);
        setLoading(false);
        setError(null);
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data, error: authError }) => {
        if (!alive || receivedAuthEvent) return;
        if (authError) setError("Нэвтрэлтийн төлөвийг уншиж чадсангүй.");
        else setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (alive && !receivedAuthEvent) {
          setError("Нэвтрэлтийн төлөвийг уншиж чадсангүй.");
          setLoading(false);
        }
      });
    const refresh = (state: string) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const appState = AppState.addEventListener("change", refresh);
    return () => {
      alive = false;
      subscription.unsubscribe();
      appState.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [attempt]);

  return (
    <Context.Provider
      value={{
        session,
        loading,
        error,
        retry: () => {
          setLoading(true);
          setError(null);
          setAttempt((n) => n + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider байхгүй байна.");
  return value;
}
