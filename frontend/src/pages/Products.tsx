import React, { useEffect, useState } from "react";
import { api } from "../api/client";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  unit: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", sku: "", price: "", unit: "шт" });

  async function load() {
    setProducts(await api.get<Product[]>("/products"));
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/products", { ...form, price: Number(form.price) });
    setForm({ name: "", sku: "", price: "", unit: "шт" });
    load();
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Товары / услуги</h1>
      <form onSubmit={create} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Название"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Артикул"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
        <input
          className="border rounded px-2 py-1 text-sm w-28"
          placeholder="Цена"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm w-20"
          placeholder="Ед."
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm">Добавить</button>
      </form>

      <table className="w-full bg-white rounded border text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left p-2">Название</th>
            <th className="text-left p-2">Артикул</th>
            <th className="text-left p-2">Цена</th>
            <th className="text-left p-2">Ед.</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.sku}</td>
              <td className="p-2">{Number(p.price).toLocaleString("ru-RU")} ₽</td>
              <td className="p-2">{p.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
