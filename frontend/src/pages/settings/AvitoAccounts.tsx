import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { SettingsTabs } from "./SettingsTabs";

interface AvitoAccount {
  id: string;
  name: string;
  clientId: string;
  avitoUserId: string | null;
  webhookRegistered: boolean;
  isActive: boolean;
}

export default function AvitoAccounts() {
  const [accounts, setAccounts] = useState<AvitoAccount[]>([]);
  const [form, setForm] = useState({ name: "", clientId: "", clientSecret: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setAccounts(await api.get<AvitoAccount[]>("/avito-accounts"));
  }
  useEffect(() => {
    load();
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/avito-accounts", form);
      setForm({ name: "", clientId: "", clientSecret: "" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function retry(id: string) {
    try {
      await api.post(`/avito-accounts/${id}/verify`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function disconnect(id: string) {
    if (!confirm("Отключить этот аккаунт Авито?")) return;
    await api.delete(`/avito-accounts/${id}`);
    load();
  }

  return (
    <div className="p-4">
      <SettingsTabs />
      <h1 className="text-lg font-semibold mb-1">Аккаунты Авито</h1>
      <p className="text-sm text-slate-500 mb-4">
        Можно подключить сколько угодно аккаунтов Авито — сообщения со всех будут приходить в единый
        список чатов. Client ID / Client Secret выдаются в личном кабинете разработчика на
        developers.avito.ru для каждого аккаунта отдельно.
      </p>

      <form onSubmit={connect} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap items-start">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Название (для CRM)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Client ID"
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Client Secret"
          type="password"
          value={form.clientSecret}
          onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
          required
        />
        <button disabled={busy} className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50">
          Подключить аккаунт
        </button>
      </form>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      <div className="bg-white rounded border divide-y">
        {accounts.map((a) => (
          <div key={a.id} className="p-3 flex justify-between items-center text-sm">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-slate-500">
                Client ID: {a.clientId} · avito user_id: {a.avitoUserId || "не получен"}
              </div>
              <div className="text-xs mt-1">
                {a.avitoUserId ? (
                  <span className="text-emerald-600">Авторизация ОК</span>
                ) : (
                  <span className="text-red-600">Ошибка авторизации — проверьте ключи</span>
                )}
                {" · "}
                {a.webhookRegistered ? (
                  <span className="text-emerald-600">вебхук зарегистрирован</span>
                ) : (
                  <span className="text-amber-600">вебхук не зарегистрирован (нужен публичный PUBLIC_BASE_URL)</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => retry(a.id)} className="border rounded px-2 py-1 text-xs">
                Повторить подключение
              </button>
              <button onClick={() => disconnect(a.id)} className="border rounded px-2 py-1 text-xs text-red-600">
                Отключить
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && <div className="p-3 text-sm text-slate-400">Нет подключенных аккаунтов</div>}
      </div>
    </div>
  );
}
