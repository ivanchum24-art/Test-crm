import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role?: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (companyName: string, fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ token: string; user: CurrentUser }>("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(companyName: string, fullName: string, email: string, password: string) {
    const data = await api.post<{ token: string; user: CurrentUser }>("/auth/register", {
      companyName,
      fullName,
      email,
      password,
    });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}
