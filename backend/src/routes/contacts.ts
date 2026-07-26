import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { asyncHandler } from "../utils/asyncHandler";

export const contactsRouter = Router();
contactsRouter.use(requireAuth);

contactsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { createdAt: "desc" },
    });
    res.json(contacts);
  })
);

const contactSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

contactsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = contactSchema.parse(req.body);
    const contact = await prisma.contact.create({ data: { workspaceId: req.workspaceId!, ...data } });
    res.json(contact);
  })
);

contactsRouter.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = contactSchema.partial().parse(req.body);
    const contact = await prisma.contact.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!contact) return res.status(404).json({ error: "Контакт не найден" });
    const updated = await prisma.contact.update({ where: { id: contact.id }, data });
    res.json(updated);
  })
);

contactsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.contact.deleteMany({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    res.json({ ok: true });
  })
);

// Экспорт базы контактов в CSV (право canExportContacts)
contactsRouter.get(
  "/export/csv",
  requirePermission("canExportContacts"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const contacts = await prisma.contact.findMany({ where: { workspaceId: req.workspaceId! } });
    const header = "full_name,phone,email,company,notes\n";
    const rows = contacts
      .map((c) =>
        [c.fullName, c.phone ?? "", c.email ?? "", c.company ?? "", (c.notes ?? "").replace(/\n/g, " ")]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=contacts.csv");
    res.send(header + rows);
  })
);

const importRowSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
});
const importSchema = z.object({ rows: z.array(importRowSchema) });

// Импорт базы контактов (JSON-массив строк, распарсенный на фронте из CSV)
contactsRouter.post(
  "/import",
  requirePermission("canExportContacts"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rows } = importSchema.parse(req.body);
    const created = await prisma.contact.createMany({
      data: rows.map((r) => ({
        workspaceId: req.workspaceId!,
        fullName: r.fullName,
        phone: r.phone || null,
        email: r.email || null,
        company: r.company || null,
      })),
    });
    res.json({ imported: created.count });
  })
);
