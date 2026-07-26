import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const webhooksAvitoRouter = Router();

/**
 * Единый вебхук-эндпоинт для ВСЕХ подключенных аккаунтов Авито.
 * Авито передаёт в payload.value.user_id идентификатор аккаунта,
 * на который пришло сообщение - по нему находим нужный AvitoAccount
 * (независимо от того, сколько аккаунтов подключено к workspace).
 *
 * Структура события (Messenger API v3):
 * {
 *   "payload": {
 *     "type": "message",
 *     "value": {
 *       "id": "<message_id>",
 *       "chat_id": "<chat_id>",
 *       "user_id": <avito_user_id получателя>,
 *       "author_id": <avito_user_id автора>,
 *       "content": { "text": "..." },
 *       "type": "text",
 *       "direction": "in" | "out",
 *       "item_id": <id объявления>,
 *       "created": <unix ts>
 *     }
 *   }
 * }
 */
webhooksAvitoRouter.post(
  "/avito",
  asyncHandler(async (req, res) => {
    // Отвечаем Авито быстро и всегда 200, чтобы он не ретраил бесконечно
    res.status(200).json({ ok: true });

    const payload = req.body?.payload;
    if (!payload || payload.type !== "message") return;

    const value = payload.value;
    if (!value) return;

    // Игнорируем эхо собственных исходящих сообщений (мы их уже сохранили сами)
    if (value.direction === "out") return;

    const recipientAvitoUserId = String(value.user_id ?? "");
    if (!recipientAvitoUserId) return;

    const account = await prisma.avitoAccount.findFirst({
      where: { avitoUserId: recipientAvitoUserId, isActive: true },
    });
    if (!account) {
      console.warn(`Вебхук от Авито: аккаунт с user_id=${recipientAvitoUserId} не найден`);
      return;
    }

    const externalChatId = String(value.chat_id);

    let chat = await prisma.chat.findUnique({
      where: { avitoAccountId_externalChatId: { avitoAccountId: account.id, externalChatId } },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          workspaceId: account.workspaceId,
          channelType: "AVITO",
          avitoAccountId: account.id,
          externalChatId,
          itemTitle: value.item_title ?? null,
          lastMessageAt: new Date(),
          hasUnread: true,
        },
      });

      // Автоматически создаём сделку в первом этапе основной воронки
      const pipeline = await prisma.pipeline.findFirst({
        where: { workspaceId: account.workspaceId, isDefault: true },
        include: { stages: { orderBy: { order: "asc" } } },
      });
      if (pipeline && pipeline.stages.length > 0) {
        await prisma.deal.create({
          data: {
            workspaceId: account.workspaceId,
            title: value.item_title ? `Заявка: ${value.item_title}` : "Новая заявка с Авито",
            pipelineId: pipeline.id,
            stageId: pipeline.stages[0].id,
            chatId: chat.id,
          },
        });
      }
    } else {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { lastMessageAt: new Date(), hasUnread: true },
      });
    }

    await prisma.message.create({
      data: {
        chatId: chat.id,
        direction: "IN",
        text: value.content?.text ?? "[вложение/не текстовое сообщение]",
        externalMessageId: value.id ? String(value.id) : null,
        isRead: false,
      },
    });
  })
);
