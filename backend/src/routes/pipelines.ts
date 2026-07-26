import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { asyncHandler } from "../utils/asyncHandler";

export const pipelinesRouter = Router();
pipelinesRouter.use(requireAuth);

pipelinesRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const pipelines = await prisma.pipeline.findMany({
      where: { workspaceId: req.workspaceId! },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    res.json(pipelines);
  })
);

const createPipelineSchema = z.object({
  name: z.string().min(1),
  stages: z.array(z.object({ name: z.string().min(1), color: z.string().optional() })).min(1),
});

pipelinesRouter.post(
  "/",
  requirePermission("canManagePipeline"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name, stages } = createPipelineSchema.parse(req.body);
    const pipeline = await prisma.pipeline.create({
      data: {
        workspaceId: req.workspaceId!,
        name,
        stages: {
          create: stages.map((s, i) => ({ name: s.name, order: i + 1, color: s.color ?? "#94a3b8" })),
        },
      },
      include: { stages: true },
    });
    res.json(pipeline);
  })
);

const updateStagesSchema = z.object({
  stages: z
    .array(z.object({ id: z.string().optional(), name: z.string().min(1), color: z.string().optional() }))
    .min(1),
});

// Полная замена набора этапов воронки (добавление/удаление/переименование/порядок)
pipelinesRouter.put(
  "/:id/stages",
  requirePermission("canManagePipeline"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!pipeline) return res.status(404).json({ error: "Воронка не найдена" });

    const { stages } = updateStagesSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.pipelineStage.findMany({ where: { pipelineId: pipeline.id } });
      const keepIds = new Set(stages.filter((s) => s.id).map((s) => s.id));
      const toDelete = existing.filter((s) => !keepIds.has(s.id));
      // Сделки на удаляемых этапах переносим на первый оставшийся этап
      if (toDelete.length > 0) {
        const fallbackStageId = stages[0].id;
        if (fallbackStageId) {
          await tx.deal.updateMany({
            where: { stageId: { in: toDelete.map((s) => s.id) } },
            data: { stageId: fallbackStageId },
          });
        }
        await tx.pipelineStage.deleteMany({ where: { id: { in: toDelete.map((s) => s.id) } } });
      }
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (s.id) {
          await tx.pipelineStage.update({
            where: { id: s.id },
            data: { name: s.name, color: s.color ?? "#94a3b8", order: i + 1 },
          });
        } else {
          await tx.pipelineStage.create({
            data: { pipelineId: pipeline.id, name: s.name, color: s.color ?? "#94a3b8", order: i + 1 },
          });
        }
      }
    });

    const updated = await prisma.pipeline.findUnique({
      where: { id: pipeline.id },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    res.json(updated);
  })
);
