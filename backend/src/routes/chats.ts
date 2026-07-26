import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { sendAvitoMessage, markAvitoChatRead } from "../services/avitoClient";

export const chatsRouter = Router();
chatsRouter.use(requireAuth);

// Единый список чатов со всех подключенных аккаунтов Авито
chatsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const chats = await prisma.chat.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { lastMessageAt: "desc" },
      include: {
        avitoAccount: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true } },
        contact: { select: { id: true, fullName: true, phone: true } },
        deal: { select: { id: true, stageId: true, title: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    res.json(chats);
  })
);

chatsRouter.get(
  "/:id/messages",
  asyncHandler(async (req: AuthedRequest, res) => {
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!chat) return res.status(404).json({ error: "Чат не найден" });

    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
      include: { authorUser: { select: { id: true, fullName: true } } },
    });
    res.json(messages);
  })
);

const sendSchema = z.object({ text: z.string().min(1) });

// Ответ клиенту прямо из CRM -> уходит в Авито через API
chatsRouter.post(
  "/:id/messages",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { text } = sendSchema.parse(req.body);
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
      include: { avitoAccount: true },
    });
    if (!chat) return res.status(404).json({ error: "Чат не найден" });
    if (!chat.avitoAccount) {
      return res.status(400).json({ error: "У этого чата не указан аккаунт Авито" });
    }

    const sent = await sendAvitoMessage(chat.avitoAccount, chat.externalChatId, text);

    const message = await prisma.message.create({
      data: {
        chatId: chat.id,
        direction: "OUT",
        text,
        externalMessageId: sent.id,
        isRead: true,
        authorUserId: req.userId!,
      },
    });

    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });

    res.json(message);
  })
);

// Отметить чат прочитанным (и в CRM, и на стороне Авито)
chatsRouter.post(
  "/:id/read",
  asyncHandler(async (req: AuthedRequest, res) => {
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
      include: { avitoAccount: true },
    });
    if (!chat) return res.status(404).json({ error: "Чат не найден" });

    await prisma.message.updateMany({ where: { chatId: chat.id, direction: "IN" }, data: { isRead: true } });
    await prisma.chat.update({ where: { id: chat.id }, data: { hasUnread: false } });

    if (chat.avitoAccount) {
      markAvitoChatRead(chat.avitoAccount, chat.externalChatId).catch(() => {});
    }
    res.json({ ok: true });
  })
);

const assignSchema = z.object({ managerId: z.string().nullable() });

// Закрепить менеджера за карточкой (чатом)
chatsRouter.patch(
  "/:id/assign",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { managerId } = assignSchema.parse(req.body);
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!chat) return res.status(404).json({ error: "Чат не найден" });

    const updated = await prisma.chat.update({
      where: { id: chat.id },
      data: { assignedManagerId: managerId },
    });
    res.json(updated);
  })
);

const linkContactSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

// Сохранить чат как карточку клиента в базе (создать/привязать Contact)
chatsRouter.post(
  "/:id/save-contact",
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = linkContactSchema.parse(req.body);
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!chat) return res.status(404).json({ error: "Чат не найден" });

    const contact = await prisma.contact.create({
      data: { workspaceId: req.workspaceId!, ...body },
    });
    await prisma.chat.update({ where: { id: chat.id }, data: { contactId: contact.id, clientName: body.fullName } });

    res.json(contact);
  })
);
