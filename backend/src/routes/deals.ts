import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const dealsRouter = Router();
dealsRouter.use(requireAuth);

dealsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const pipelineId = req.query.pipelineId as string | undefined;
    const deals = await prisma.deal.findMany({
      where: { workspaceId: req.workspaceId!, ...(pipelineId ? { pipelineId } : {}) },
      include: {
        stage: true,
        manager: { select: { id: true, fullName: true } },
        contact: { select: { id: true, fullName: true } },
        chat: { select: { id: true, avitoAccountId: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(deals);
  })
);

const createDealSchema = z.object({
  title: z.string().min(1),
  pipelineId: z.string(),
  stageId: z.string(),
  contactId: z.string().optional(),
  managerId: z.string().optional(),
  amount: z.number().optional(),
});

dealsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = createDealSchema.parse(req.body);
    const deal = await prisma.deal.create({
      data: { workspaceId: req.workspaceId!, ...data },
    });
    res.json(deal);
  })
);

const moveDealSchema = z.object({ stageId: z.string() });

dealsRouter.patch(
  "/:id/stage",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { stageId } = moveDealSchema.parse(req.body);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!deal) return res.status(404).json({ error: "Сделка не найдена" });
    const updated = await prisma.deal.update({ where: { id: deal.id }, data: { stageId } });
    res.json(updated);
  })
);

const assignManagerSchema = z.object({ managerId: z.string().nullable() });

dealsRouter.patch(
  "/:id/manager",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { managerId } = assignManagerSchema.parse(req.body);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!deal) return res.status(404).json({ error: "Сделка не найдена" });
    const updated = await prisma.deal.update({ where: { id: deal.id }, data: { managerId } });
    res.json(updated);
  })
);

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  price: z.number(),
  quantity: z.number().default(1),
});
const setItemsSchema = z.object({ items: z.array(itemSchema) });

// Задать список товаров сделки - сумма сделки пересчитывается автоматически
dealsRouter.put(
  "/:id/items",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { items } = setItemsSchema.parse(req.body);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!deal) return res.status(404).json({ error: "Сделка не найдена" });

    await prisma.$transaction(async (tx) => {
      await tx.dealItem.deleteMany({ where: { dealId: deal.id } });
      if (items.length > 0) {
        await tx.dealItem.createMany({
          data: items.map((it) => ({ dealId: deal.id, ...it })),
        });
      }
      const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      await tx.deal.update({ where: { id: deal.id }, data: { amount: total } });
    });

    const updated = await prisma.deal.findUnique({ where: { id: deal.id }, include: { items: true } });
    res.json(updated);
  })
);

const statusSchema = z.object({ status: z.enum(["OPEN", "WON", "LOST"]) });
dealsRouter.patch(
  "/:id/status",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { status } = statusSchema.parse(req.body);
    const deal = await prisma.deal.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!deal) return res.status(404).json({ error: "Сделка не найдена" });
    const updated = await prisma.deal.update({ where: { id: deal.id }, data: { status } });
    res.json(updated);
  })
);
