import React, { useEffect, useState } from "react";
import { api } from "../api/client";

interface InvoiceItem {
  id: string;
  name: string;
  price: string;
  quantity: string;
}
interface Invoice {
  id: string;
  number: string;
  status: string;
  totalAmount: string;
  items: InvoiceItem[];
  deal: { id: string; title: string } | null;
}

const statusLabel: Record<string, string> = {
  DRAFT: "Черновик",
  SENT: "Отправлен",
  PAID: "Оплачен",
  CANCELLED: "Отменён",
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [number, setNumber] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemQty, setItemQty] = useState("1");

  async function load() {
    setInvoices(await api.get<Invoice[]>("/invoices"));
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/invoices", {
      number,
      items: [{ name: itemName, price: Number(itemPrice), quantity: Number(itemQty) }],
    });
    setNumber("");
    setItemName("");
    setItemPrice("");
    setItemQty("1");
    load();
  }

  async function setStatus(id: string, status: string) {
    await api.patch(`/invoices/${id}/status`, { status });
    load();
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Счета</h1>

      <form onSubmit={create} className="bg-white p-3 rounded border mb-4 flex gap-2 flex-wrap">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Номер счёта"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Позиция"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm w-24"
          placeholder="Цена"
          type="number"
          value={itemPrice}
          onChange={(e) => setItemPrice(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1 text-sm w-20"
          placeholder="Кол-во"
          type="number"
          value={itemQty}
          onChange={(e) => setItemQty(e.target.value)}
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm">Выставить счёт</button>
      </form>

      <div className="bg-white rounded border divide-y">
        {invoices.map((inv) => (
          <div key={inv.id} className="p-3 flex justify-between items-center text-sm">
            <div>
              <div className="font-medium">Счёт №{inv.number}</div>
              <div className="text-slate-500">
                {inv.items.map((i) => i.name).join(", ")} · {Number(inv.totalAmount).toLocaleString("ru-RU")} ₽
              </div>
            </div>
            <select
              className="border rounded px-2 py-1 text-xs"
              value={inv.status}
              onChange={(e) => setStatus(inv.id, e.target.value)}
            >
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
