import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { SettingsTabs } from "./SettingsTabs";

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: { id: string; name: string } | null;
}
interface Role {
  id: string;
  name: string;
}

const roleLabel: Record<string, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  VIEWER: "Наблюдатель",
};

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({ email: "", fullName: "", password: "", roleId: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [u, r] = await Promise.all([api.get<UserRow[]>("/users"), api.get<Role[]>("/users/roles")]);
    setUsers(u);
    setRoles(r);
    if (!form.roleId && r.length > 0) {
      const managerRole = r.find((role) => role.name === "MANAGER") || r[0];
      setForm((f) => ({ ...f, roleId: managerRole.id }));
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/users", form);
      setForm({ email: "", fullName: "", password: "", roleId: form.roleId });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleActive(u: UserRow) {
    await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
    load();
  }

  async function changeRole(u: UserRow, roleId: string) {
    await api.patch(`/users/${u.id}`, { roleId });
    load();
  }

  return (
    <div className="p-4">
      <SettingsTabs />
      <h1 className="text-lg font-semibold mb-1">Пользователи и роли</h1>
      <p className="text-sm text-slate-500 mb-4">
        Каждый сотрудник входит под своим email/паролем. Права определяются ролью (что можно видеть и
        редактировать в CRM).
      </p>

      <form onSubmit={invite} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Имя сотрудника"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
        <input
          type="email"
          className="border rounded px-2 py-1 text-sm"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          className="border rounded px-2 py-1 text-sm"
          placeholder="Пароль"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={form.roleId}
          onChange={(e) => setForm({ ...form, roleId: e.target.value })}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {roleLabel[r.name] || r.name}
            </option>
          ))}
        </select>
        <button className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm">Добавить сотрудника</button>
      </form>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      <div className="bg-white rounded border divide-y">
        {users.map((u) => (
          <div key={u.id} className="p-3 flex justify-between items-center text-sm">
            <div>
              <div className="font-medium">
                {u.fullName} {!u.isActive && <span className="text-red-500 text-xs">(отключен)</span>}
              </div>
              <div className="text-slate-500">{u.email}</div>
            </div>
            <div className="flex gap-2 items-center">
              <select
                className="border rounded px-2 py-1 text-xs"
                value={u.role?.id || ""}
                onChange={(e) => changeRole(u, e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {roleLabel[r.name] || r.name}
                  </option>
                ))}
              </select>
              <button onClick={() => toggleActive(u)} className="text-xs border rounded px-2 py-1">
                {u.isActive ? "Отключить" : "Включить"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
