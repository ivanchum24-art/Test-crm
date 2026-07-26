import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

inventoryRouter.get(
  "/materials",
  asyncHandler(async (req: AuthedRequest, res) => {
    const materials = await prisma.material.findMany({ where: { workspaceId: req.workspaceId! } });
    res.json(materials);
  })
);

const materialSchema = z.object({
  name: z.string().min(1),
  unit: z.string().default("шт"),
  stockQty: z.number().default(0),
  costPrice: z.number().default(0),
  deliveryCostPerUnit: z.number().default(0),
});

inventoryRouter.post(
  "/materials",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = materialSchema.parse(req.body);
    const material = await prisma.material.create({ data: { workspaceId: req.workspaceId!, ...data } });
    res.json(material);
  })
);

inventoryRouter.put(
  "/materials/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = materialSchema.partial().parse(req.body);
    const material = await prisma.material.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!material) return res.status(404).json({ error: "Материал не найден" });
    const updated = await prisma.material.update({ where: { id: material.id }, data });
    res.json(updated);
  })
);

// Списание остатков материала (расход на производство)
const consumeSchema = z.object({ quantity: z.number().positive() });
inventoryRouter.post(
  "/materials/:id/consume",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { quantity } = consumeSchema.parse(req.body);
    const material = await prisma.material.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!material) return res.status(404).json({ error: "Материал не найден" });
    const updated = await prisma.material.update({
      where: { id: material.id },
      data: { stockQty: { decrement: quantity } },
    });
    res.json(updated);
  })
);

// Расчёт себестоимости товара по норме расхода материалов (MaterialUsage)
inventoryRouter.get(
  "/products/:productId/cost",
  asyncHandler(async (req: AuthedRequest, res) => {
    const usages = await prisma.materialUsage.findMany({
      where: { productId: req.params.productId },
      include: { material: true },
    });
    const materialsCost = usages.reduce(
      (sum, u) => sum + Number(u.quantity) * (Number(u.material.costPrice) + Number(u.material.deliveryCostPerUnit)),
      0
    );
    res.json({ productId: req.params.productId, materialsCost, breakdown: usages });
  })
);

const usageSchema = z.object({ materialId: z.string(), quantity: z.number().positive() });
inventoryRouter.post(
  "/products/:productId/usage",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { materialId, quantity } = usageSchema.parse(req.body);
    const usage = await prisma.materialUsage.create({
      data: { productId: req.params.productId, materialId, quantity },
    });
    res.json(usage);
  })
);
