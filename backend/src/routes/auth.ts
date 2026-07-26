import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

const registerSchema = z.object({
  companyName: z.string().min(2),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

// Регистрация первой компании + первого пользователя (владельца)
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { companyName, fullName, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Пользователь с таким email уже существует" });
    }

    const workspace = await prisma.workspace.create({ data: { name: companyName } });

    const [ownerRole, adminRole, managerRole, viewerRole] = await Promise.all([
      prisma.role.create({
        data: {
          workspaceId: workspace.id,
          name: "OWNER",
          canManageAvitoAccounts: true,
          canManageUsers: true,
          canManagePipeline: true,
          canViewAllChats: true,
          canExportContacts: true,
          canManageFinance: true,
        },
      }),
      prisma.role.create({
        data: {
          workspaceId: workspace.id,
          name: "ADMIN",
          canManageAvitoAccounts: true,
          canManageUsers: true,
          canManagePipeline: true,
          canViewAllChats: true,
          canExportContacts: true,
          canManageFinance: true,
        },
      }),
      prisma.role.create({
        data: {
          workspaceId: workspace.id,
          name: "MANAGER",
          canViewAllChats: false,
        },
      }),
      prisma.role.create({
        data: {
          workspaceId: workspace.id,
          name: "VIEWER",
          canViewAllChats: true,
        },
      }),
    ]);

    const pipeline = await prisma.pipeline.create({
      data: {
        workspaceId: workspace.id,
        name: "Основная воронка",
        isDefault: true,
        stages: {
          create: [
            { name: "Новая заявка", order: 1, color: "#3b82f6" },
            { name: "В работе", order: 2, color: "#f59e0b" },
            { name: "Согласование", order: 3, color: "#a855f7" },
            { name: "Успешно", order: 4, color: "#22c55e" },
            { name: "Отказ", order: 5, color: "#ef4444" },
          ],
        },
      },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        email,
        passwordHash,
        fullName,
        roleId: ownerRole.id,
      },
    });

    const token = signToken({ userId: user.id, workspaceId: workspace.id });
    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName },
      workspace: { id: workspace.id, name: workspace.name },
      pipelineId: pipeline.id,
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { email }, include: { role: true } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    const token = signToken({ userId: user.id, workspaceId: user.workspaceId });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role?.name,
      },
    });
  })
);
