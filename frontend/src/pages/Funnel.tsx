import React, { useEffect, useState } from "react";
import { api } from "../api/client";

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
}
interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}
interface Deal {
  id: string;
  title: string;
  stageId: string;
  amount: string;
  status: string;
  manager: { id: string; fullName: string } | null;
  contact: { id: string; fullName: string } | null;
}

export default function Funnel() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);

  async function load() {
    const pls = await api.get<Pipeline[]>("/pipelines");
    setPipelines(pls);
    const pid = pipelineId || pls[0]?.id || null;
    setPipelineId(pid);
    if (pid) {
      const d = await api.get<Deal[]>(`/deals?pipelineId=${pid}`);
      setDeals(d);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (pipelineId) api.get<Deal[]>(`/deals?pipelineId=${pipelineId}`).then(setDeals);
  }, [pipelineId]);

  const pipeline = pipelines.find((p) => p.id === pipelineId);

  async function moveDeal(dealId: string, stageId: string) {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stageId } : d)));
    await api.patch(`/deals/${dealId}/stage`, { stageId });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Воронка продаж</h1>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={pipelineId || ""}
          onChange={(e) => setPipelineId(e.target.value)}
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {pipeline && (
        <div className="flex gap-3 overflow-x-auto">
          {pipeline.stages.map((stage) => (
            <div
              key={stage.id}
              className="w-72 flex-shrink-0 bg-white rounded-lg border"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const dealId = e.dataTransfer.getData("dealId");
                if (dealId) moveDeal(dealId, stage.id);
              }}
            >
              <div
                className="px-3 py-2 font-medium text-sm rounded-t-lg text-white"
                style={{ backgroundColor: stage.color }}
              >
                {stage.name} · {deals.filter((d) => d.stageId === stage.id).length}
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {deals
                  .filter((d) => d.stageId === stage.id)
                  .map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("dealId", deal.id)}
                      className="border rounded p-2 text-sm bg-slate-50 cursor-move"
                    >
                      <div className="font-medium truncate">{deal.title}</div>
                      <div className="text-xs text-slate-500">
                        {deal.contact?.fullName || "Без контакта"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {deal.manager?.fullName || "Менеджер не назначен"}
                      </div>
                      <div className="text-sm font-semibold mt-1">{Number(deal.amount).toLocaleString("ru-RU")} ₽</div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
