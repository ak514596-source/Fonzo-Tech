import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { apiRequest, setAuthToken } from "@/lib/queryClient";

type User = {
  id: number;
  email: string;
  name: string;
  role: "customer" | "team";
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isTeam: boolean;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Where the staff/customer session is remembered so a page refresh does not
// force a fresh login. The server still validates the token on every request,
// so this is just convenience — not a security boundary.
const STORAGE_KEY = "fonzo.auth";

type StoredAuth = { user: User; token: string };

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed && parsed.user && parsed.token) return parsed;
  } catch {
    /* storage unavailable or corrupt — fall back to a logged-out state */
  }
  return null;
}

function saveStored(value: StoredAuth | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// Restore any saved session at module load so the token is attached to the
// very first API request, before React has finished mounting.
const initialAuth = loadStored();
setAuthToken(initialAuth?.token ?? null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initialAuth?.user ?? null);
  const [token, setToken] = useState<string | null>(initialAuth?.token ?? null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isTeam: user?.role === "team",
      signIn: (nextUser, nextToken) => {
        setUser(nextUser);
        setToken(nextToken);
        setAuthToken(nextToken);
        saveStored({ user: nextUser, token: nextToken });
      },
      signOut: () => {
        // Best-effort: tell the server to drop the session. Uses the current
        // token, so this must run before the token is cleared.
        apiRequest("POST", "/api/auth/logout").catch(() => {});
        setUser(null);
        setToken(null);
        setAuthToken(null);
        saveStored(null);
      },
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
