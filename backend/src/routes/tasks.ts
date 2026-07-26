import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const assigneeId = req.query.assigneeId as string | undefined;
    const tasks = await prisma.task.findMany({
      where: { workspaceId: req.workspaceId!, ...(assigneeId ? { assigneeId } : {}) },
      include: { assignee: { select: { id: true, fullName: true } }, deal: { select: { id: true, title: true } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
    res.json(tasks);
  })
);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dealId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueAt: z.string().datetime().optional(),
  reminderAt: z.string().datetime().optional(),
});

tasksRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = createTaskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        workspaceId: req.workspaceId!,
        creatorId: req.userId!,
        title: data.title,
        description: data.description,
        dealId: data.dealId,
        assigneeId: data.assigneeId,
        priority: data.priority,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : undefined,
      },
    });
    res.json(task);
  })
);

const updateTaskSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

tasksRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = updateTaskSchema.parse(req.body);
    const task = await prisma.task.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!task) return res.status(404).json({ error: "Задача не найдена" });
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { ...data, dueAt: data.dueAt ? new Date(data.dueAt) : data.dueAt },
    });
    res.json(updated);
  })
);
