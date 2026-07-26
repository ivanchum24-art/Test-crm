import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { asyncHandler } from "../utils/asyncHandler";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

invoicesRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { workspaceId: req.workspaceId! },
      include: { items: true, deal: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  })
);

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  price: z.number(),
  quantity: z.number().default(1),
});

const createInvoiceSchema = z.object({
  dealId: z.string().optional(),
  number: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

// Выставление счёта по сделке (со списком товаров и суммой)
invoicesRouter.post(
  "/",
  requirePermission("canManageFinance"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { dealId, number, items } = createInvoiceSchema.parse(req.body);
    const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

    const invoice = await prisma.invoice.create({
      data: {
        workspaceId: req.workspaceId!,
        dealId,
        number,
        totalAmount: total,
        items: { create: items },
      },
      include: { items: true },
    });
    res.json(invoice);
  })
);

const statusSchema = z.object({ status: z.enum(["DRAFT", "SENT", "PAID", "CANCELLED"]) });

invoicesRouter.patch(
  "/:id/status",
  requirePermission("canManageFinance"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { status } = statusSchema.parse(req.body);
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!invoice) return res.status(404).json({ error: "Счёт не найден" });
    const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status } });
    res.json(updated);
  })
);
