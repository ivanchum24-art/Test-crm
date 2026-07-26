import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// Фронтенд опрашивает этот эндпоинт (например, раз в минуту) чтобы показать
// уведомления: непрочитанные чаты + задачи с наступившим напоминанием/дедлайном.
notificationsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const now = new Date();

    const unreadChats = await prisma.chat.count({
      where: { workspaceId: req.workspaceId!, hasUnread: true },
    });

    const dueTasks = await prisma.task.findMany({
      where: {
        workspaceId: req.workspaceId!,
        assigneeId: req.userId!,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        OR: [{ reminderAt: { lte: now } }, { dueAt: { lte: now } }],
      },
      orderBy: { dueAt: "asc" },
    });

    res.json({ unreadChats, dueTasks });
  })
);
