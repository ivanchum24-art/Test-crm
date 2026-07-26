import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { asyncHandler } from "../utils/asyncHandler";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const users = await prisma.user.findMany({
      where: { workspaceId: req.workspaceId! },
      select: { id: true, email: true, fullName: true, isActive: true, role: { select: { id: true, name: true } } },
    });
    res.json(users);
  })
);

usersRouter.get(
  "/roles",
  asyncHandler(async (req: AuthedRequest, res) => {
    const roles = await prisma.role.findMany({ where: { workspaceId: req.workspaceId! } });
    res.json(roles);
  })
);

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(6),
  roleId: z.string(),
});

// Добавить нового сотрудника (пользователя), который будет входить под своим аккаунтом
usersRouter.post(
  "/",
  requirePermission("canManageUsers"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = inviteSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "Такой email уже используется" });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        workspaceId: req.workspaceId!,
        email: data.email,
        fullName: data.fullName,
        passwordHash,
        roleId: data.roleId,
      },
    });
    res.json({ id: user.id, email: user.email, fullName: user.fullName });
  })
);

const updateUserSchema = z.object({
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().optional(),
});

usersRouter.patch(
  "/:id",
  requirePermission("canManageUsers"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = updateUserSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { id: req.params.id, workspaceId: req.workspaceId! } });
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    res.json({ id: updated.id, email: updated.email, isActive: updated.isActive });
  })
);
