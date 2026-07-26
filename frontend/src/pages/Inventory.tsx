import React, { useEffect, useState } from "react";
import { api } from "../api/client";

interface Material {
  id: string;
  name: string;
  unit: string;
  stockQty: string;
  costPrice: string;
  deliveryCostPerUnit: string;
}

export default function Inventory() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState({ name: "", unit: "шт", stockQty: "0", costPrice: "0", deliveryCostPerUnit: "0" });

  async function load() {
    setMaterials(await api.get<Material[]>("/inventory/materials"));
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/inventory/materials", {
      name: form.name,
      unit: form.unit,
      stockQty: Number(form.stockQty),
      costPrice: Number(form.costPrice),
      deliveryCostPerUnit: Number(form.deliveryCostPerUnit),
    });
    setForm({ name: "", unit: "шт", stockQty: "0", costPrice: "0", deliveryCostPerUnit: "0" });
    load();
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-1">Материалы и остатки</h1>
      <p className="text-sm text-slate-500 mb-4">
        Базовый учёт для производства: остатки, себестоимость и затраты на доставку по каждому материалу.
        Привязка расхода материалов к товарам делается через API <code>/inventory/products/:id/usage</code>.
      </p>

      <form onSubmit={create} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Материал"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm w-20"
          placeholder="Ед."
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
        <input
          className="border rounded px-2 py-1 text-sm w-24"
          placeholder="Остаток"
          type="number"
          value={form.stockQty}
          onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
        />
        <input
          className="border rounded px-2 py-1 text-sm w-28"
          placeholder="Себестоимость/ед"
          type="number"
          value={form.costPrice}
          onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
        />
        <input
          className="border rounded px-2 py-1 text-sm w-32"
          placeholder="Доставка/ед"
          type="number"
          value={form.deliveryCostPerUnit}
          onChange={(e) => setForm({ ...form, deliveryCostPerUnit: e.target.value })}
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm">Добавить материал</button>
      </form>

      <table className="w-full bg-white rounded border text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left p-2">Материал</th>
            <th className="text-left p-2">Остаток</th>
            <th className="text-left p-2">Себестоимость/ед</th>
            <th className="text-left p-2">Доставка/ед</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="p-2">{m.name}</td>
              <td className="p-2">
                {m.stockQty} {m.unit}
              </td>
              <td className="p-2">{Number(m.costPrice).toLocaleString("ru-RU")} ₽</td>
              <td className="p-2">{Number(m.deliveryCostPerUnit).toLocaleString("ru-RU")} ₽</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
