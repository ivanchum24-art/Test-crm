import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { asyncHandler } from "../utils/asyncHandler";
import { fetchAvitoUserId, registerWebhook } from "../services/avitoClient";

export const avitoAccountsRouter = Router();
avitoAccountsRouter.use(requireAuth);

avitoAccountsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const accounts = await prisma.avitoAccount.findMany({
      where: { workspaceId: req.workspaceId! },
      select: {
        id: true,
        name: true,
        clientId: true,
        avitoUserId: true,
        webhookRegistered: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.json(accounts);
  })
);

const connectSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

// Подключение НОВОГО аккаунта Авито (можно вызывать сколько угодно раз -
// у каждого аккаунта Авито свой client_id/client_secret, получаемые в
// личном кабинете разработчика Авито: developers.avito.ru)
avitoAccountsRouter.post(
  "/",
  requirePermission("canManageAvitoAccounts"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name, clientId, clientSecret } = connectSchema.parse(req.body);

    const account = await prisma.avitoAccount.create({
      data: { workspaceId: req.workspaceId!, name, clientId, clientSecret },
    });

    try {
      const avitoUserId = await fetchAvitoUserId(account);
      const updated = await prisma.avitoAccount.update({
        where: { id: account.id },
        data: { avitoUserId },
      });

      const publicBase = process.env.PUBLIC_BASE_URL;
      if (publicBase && !publicBase.includes("your-domain")) {
        await registerWebhook(updated, `${publicBase}/webhooks/avito`);
      }

      res.json({ ok: true, account: { id: updated.id, name: updated.name, avitoUserId } });
    } catch (err: any) {
      // Аккаунт создан, но авторизация в Авито не прошла - сообщаем причину,
      // пользователь может проверить ключи и повторить попытку через /verify
      res.status(207).json({
        ok: false,
        account: { id: account.id, name: account.name },
        error: err.message,
      });
    }
  })
);

// Повторная попытка авторизации/регистрации вебхука для уже созданного аккаунта
avitoAccountsRouter.post(
  "/:id/verify",
  requirePermission("canManageAvitoAccounts"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const account = await prisma.avitoAccount.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!account) return res.status(404).json({ error: "Аккаунт не найден" });

    const avitoUserId = await fetchAvitoUserId(account);
    const updated = await prisma.avitoAccount.update({
      where: { id: account.id },
      data: { avitoUserId },
    });

    const publicBase = process.env.PUBLIC_BASE_URL;
    if (publicBase && !publicBase.includes("your-domain")) {
      await registerWebhook(updated, `${publicBase}/webhooks/avito`);
    }

    res.json({ ok: true });
  })
);

avitoAccountsRouter.delete(
  "/:id",
  requirePermission("canManageAvitoAccounts"),
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.avitoAccount.updateMany({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
      data: { isActive: false },
    });
    res.json({ ok: true });
  })
);
