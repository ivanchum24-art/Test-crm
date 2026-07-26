import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

interface Contact {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  company: string | null;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", company: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setContacts(await api.get<Contact[]>("/contacts"));
  }

  useEffect(() => {
    load();
  }, []);

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/contacts", form);
    setForm({ fullName: "", phone: "", email: "", company: "" });
    load();
  }

  function exportCsv() {
    const token = localStorage.getItem("token");
    fetch("/api/contacts/export/csv", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "contacts.csv";
        a.click();
      });
  }

  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || "");
      const lines = text.split("\n").filter(Boolean);
      const rows = lines.slice(1).map((line) => {
        const [fullName, phone, email, company] = line.split(",").map((v) => v.replace(/^"|"$/g, ""));
        return { fullName, phone, email, company };
      });
      await api.post("/contacts/import", { rows });
      load();
    };
    reader.readAsText(file, "utf-8");
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold">Клиентская база</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="text-sm border rounded px-3 py-1.5 bg-white">
            Экспорт CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm border rounded px-3 py-1.5 bg-white"
          >
            Импорт CSV
          </button>
          <input
            type="file"
            accept=".csv"
            ref={fileRef}
            className="hidden"
            onChange={(e) => e.target.files && importCsv(e.target.files[0])}
          />
        </div>
      </div>

      <form onSubmit={createContact} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Имя"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Телефон"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Компания"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm">Добавить</button>
      </form>

      <table className="w-full bg-white rounded border text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left p-2">Имя</th>
            <th className="text-left p-2">Телефон</th>
            <th className="text-left p-2">Email</th>
            <th className="text-left p-2">Компания</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.fullName}</td>
              <td className="p-2">{c.phone}</td>
              <td className="p-2">{c.email}</td>
              <td className="p-2">{c.company}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
