import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { SettingsTabs } from "./SettingsTabs";

interface Stage {
  id?: string;
  name: string;
  color: string;
}
interface Pipeline {
  id: string;
  name: string;
  stages: (Stage & { id: string; order: number })[];
}

const palette = ["#3b82f6", "#f59e0b", "#a855f7", "#22c55e", "#ef4444", "#0ea5e9", "#64748b"];

export default function PipelineStages() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const pls = await api.get<Pipeline[]>("/pipelines");
    setPipelines(pls);
    const pid = pipelineId || pls[0]?.id || null;
    setPipelineId(pid);
    const p = pls.find((pl) => pl.id === pid);
    if (p) setStages(p.stages.map((s) => ({ id: s.id, name: s.name, color: s.color })));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const p = pipelines.find((pl) => pl.id === pipelineId);
    if (p) setStages(p.stages.map((s) => ({ id: s.id, name: s.name, color: s.color })));
  }, [pipelineId]);

  function updateStage(index: number, patch: Partial<Stage>) {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStage() {
    setStages((prev) => [...prev, { name: "Новый этап", color: palette[prev.length % palette.length] }]);
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    setStages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    if (!pipelineId) return;
    setSaving(true);
    try {
      await api.put(`/pipelines/${pipelineId}/stages`, { stages });
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      <SettingsTabs />
      <h1 className="text-lg font-semibold mb-1">Этапы воронки продаж</h1>
      <p className="text-sm text-slate-500 mb-4">
        Добавляйте, удаляйте, переименовывайте и меняйте порядок этапов. Сделки с удалённого этапа
        автоматически переносятся на первый этап воронки.
      </p>

      {pipelines.length > 1 && (
        <select
          className="border rounded px-2 py-1 text-sm mb-4"
          value={pipelineId || ""}
          onChange={(e) => setPipelineId(e.target.value)}
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      <div className="bg-white rounded border divide-y">
        {stages.map((s, i) => (
          <div key={s.id ?? `new-${i}`} className="p-3 flex items-center gap-2">
            <input
              type="color"
              value={s.color}
              onChange={(e) => updateStage(i, { color: e.target.value })}
              className="w-8 h-8 border rounded"
            />
            <input
              className="border rounded px-2 py-1 text-sm flex-1"
              value={s.name}
              onChange={(e) => updateStage(i, { name: e.target.value })}
            />
            <button onClick={() => move(i, -1)} className="text-xs border rounded px-2 py-1">
              ↑
            </button>
            <button onClick={() => move(i, 1)} className="text-xs border rounded px-2 py-1">
              ↓
            </button>
            <button onClick={() => removeStage(i)} className="text-xs border rounded px-2 py-1 text-red-600">
              Удалить
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={addStage} className="border rounded px-3 py-1.5 text-sm bg-white">
          + Добавить этап
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
