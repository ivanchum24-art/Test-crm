import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { SettingsTabs } from "./SettingsTabs";

interface Template {
  id: string;
  title: string;
  text: string;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState({ title: "", text: "" });

  async function load() {
    setTemplates(await api.get<Template[]>("/templates"));
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/templates", form);
    setForm({ title: "", text: "" });
    load();
  }

  async function remove(id: string) {
    await api.delete(`/templates/${id}`);
    load();
  }

  return (
    <div className="p-4">
      <SettingsTabs />
      <h1 className="text-lg font-semibold mb-1">Шаблоны быстрых ответов</h1>
      <p className="text-sm text-slate-500 mb-4">
        Эти шаблоны появляются кнопками над полем ввода в чате — один клик вставляет текст ответа.
      </p>

      <form onSubmit={create} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Короткое название (для кнопки)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm flex-1 min-w-[300px]"
          placeholder="Текст ответа"
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          required
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm">Добавить шаблон</button>
      </form>

      <div className="bg-white rounded border divide-y">
        {templates.map((t) => (
          <div key={t.id} className="p-3 flex justify-between items-start text-sm">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="text-slate-500">{t.text}</div>
            </div>
            <button onClick={() => remove(t.id)} className="text-xs text-red-600">
              Удалить
            </button>
          </div>
        ))}
        {templates.length === 0 && <div className="p-3 text-sm text-slate-400">Пока нет шаблонов</div>}
      </div>
    </div>
  );
}
