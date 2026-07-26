import React from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/settings/avito", label: "Аккаунты Авито" },
  { to: "/settings/pipeline", label: "Этапы воронки" },
  { to: "/settings/templates", label: "Шаблоны ответов" },
  { to: "/settings/users", label: "Пользователи и роли" },
];

export function SettingsTabs() {
  return (
    <div className="flex gap-2 mb-4 border-b">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `px-3 py-2 text-sm ${isActive ? "border-b-2 border-slate-900 font-medium" : "text-slate-500"}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
