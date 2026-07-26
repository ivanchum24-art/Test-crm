import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const templatesRouter = Router();
templatesRouter.use(requireAuth);

templatesRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const templates = await prisma.messageTemplate.findMany({ where: { workspaceId: req.workspaceId! } });
    res.json(templates);
  })
);

const templateSchema = z.object({ title: z.string().min(1), text: z.string().min(1) });

templatesRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = templateSchema.parse(req.body);
    const template = await prisma.messageTemplate.create({ data: { workspaceId: req.workspaceId!, ...data } });
    res.json(template);
  })
);

templatesRouter.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = templateSchema.partial().parse(req.body);
    const tpl = await prisma.messageTemplate.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!tpl) return res.status(404).json({ error: "Шаблон не найден" });
    const updated = await prisma.messageTemplate.update({ where: { id: tpl.id }, data });
    res.json(updated);
  })
);

templatesRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.messageTemplate.deleteMany({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    res.json({ ok: true });
  })
);
