import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/chats", label: "Чаты" },
  { to: "/funnel", label: "Воронка" },
  { to: "/contacts", label: "Контакты" },
  { to: "/tasks", label: "Задачи" },
  { to: "/products", label: "Товары" },
  { to: "/invoices", label: "Счета" },
  { to: "/inventory", label: "Склад/материалы" },
  { to: "/settings/avito", label: "Настройки" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-slate-700">Avito CRM</div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-slate-700" : "hover:bg-slate-800"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700 text-sm">
          <div className="mb-2 truncate">{user?.fullName}</div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full text-left text-slate-400 hover:text-white"
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50 overflow-y-auto">{children}</main>
    </div>
  );
}
