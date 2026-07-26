import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const products = await prisma.product.findMany({ where: { workspaceId: req.workspaceId! } });
    res.json(products);
  })
);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  price: z.number(),
  unit: z.string().default("шт"),
});

productsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data: { workspaceId: req.workspaceId!, ...data } });
    res.json(product);
  })
);

productsRouter.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!product) return res.status(404).json({ error: "Товар не найден" });
    const updated = await prisma.product.update({ where: { id: product.id }, data });
    res.json(updated);
  })
);

productsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.product.deleteMany({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    res.json({ ok: true });
  })
);
