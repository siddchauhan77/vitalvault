import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { User } from "@shared/schema";
import { apiRequest, queryClient, setAuthToken } from "./queryClient";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (profile: { googleId: string; email: string; displayName: string; avatarUrl?: string }) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async (profile: { googleId: string; email: string; displayName: string; avatarUrl?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        }
      );
      if (!res.ok) throw new Error("Auth failed");
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      setAuthToken(data.token);
      // Clear all cached queries so they re-fetch with the new auth
      queryClient.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    if (token) {
      // Fire and forget
      apiRequest("POST", "/api/auth/logout").catch(() => {});
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
    queryClient.clear();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
