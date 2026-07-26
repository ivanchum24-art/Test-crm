import React, { useEffect, useState } from "react";
import { api } from "../api/client";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueAt: string | null;
  assignee: { id: string; fullName: string } | null;
}
interface UserOption {
  id: string;
  fullName: string;
}

const priorityColor: Record<string, string> = {
  LOW: "bg-slate-200 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState({ title: "", assigneeId: "", priority: "MEDIUM", dueAt: "" });

  async function load() {
    setTasks(await api.get<Task[]>("/tasks"));
  }

  useEffect(() => {
    load();
    api.get<UserOption[]>("/users").then(setUsers);
  }, []);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/tasks", {
      title: form.title,
      assigneeId: form.assigneeId || undefined,
      priority: form.priority,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
    });
    setForm({ title: "", assigneeId: "", priority: "MEDIUM", dueAt: "" });
    load();
  }

  async function setStatus(id: string, status: string) {
    await api.patch(`/tasks/${id}`, { status });
    load();
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Задачи</h1>

      <form onSubmit={createTask} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap items-center">
        <input
          className="border rounded px-2 py-1 text-sm flex-1 min-w-[200px]"
          placeholder="Название задачи"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
        >
          <option value="">Исполнитель</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <option value="LOW">Низкий</option>
          <option value="MEDIUM">Средний</option>
          <option value="HIGH">Высокий</option>
          <option value="URGENT">Срочно</option>
        </select>
        <input
          type="datetime-local"
          className="border rounded px-2 py-1 text-sm"
          value={form.dueAt}
          onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm">Создать</button>
      </form>

      <div className="bg-white rounded border divide-y">
        {tasks.map((t) => (
          <div key={t.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="text-slate-500">
                {t.assignee?.fullName || "Без исполнителя"} ·{" "}
                {t.dueAt ? new Date(t.dueAt).toLocaleString("ru-RU") : "без дедлайна"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${priorityColor[t.priority]}`}>{t.priority}</span>
              <select
                className="border rounded px-2 py-1 text-xs"
                value={t.status}
                onChange={(e) => setStatus(t.id, e.target.value)}
              >
                <option value="OPEN">Открыта</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="DONE">Готово</option>
                <option value="CANCELLED">Отменена</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
