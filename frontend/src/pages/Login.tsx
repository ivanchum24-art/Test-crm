import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(companyName, fullName, email, password);
      }
      navigate("/chats");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">Avito CRM</h1>
        <div className="flex text-sm rounded overflow-hidden border">
          <button
            type="button"
            className={`flex-1 py-2 ${mode === "login" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={`flex-1 py-2 ${mode === "register" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
            onClick={() => setMode("register")}
          >
            Регистрация компании
          </button>
        </div>

        {mode === "register" && (
          <>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Название компании"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Ваше имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </>
        )}

        <input
          type="email"
          className="w-full border rounded px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          disabled={busy}
          className="w-full bg-slate-900 text-white rounded py-2 disabled:opacity-50"
        >
          {mode === "login" ? "Войти" : "Создать компанию и войти"}
        </button>
      </form>
    </div>
  );
}
