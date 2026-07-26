import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth";
import { prisma } from "../lib/prisma";

type PermissionFlag =
  | "canManageAvitoAccounts"
  | "canManageUsers"
  | "canManagePipeline"
  | "canViewAllChats"
  | "canExportContacts"
  | "canManageFinance";

// Владелец (OWNER) всегда проходит проверку, остальным нужен явный флаг на роли
export function requirePermission(flag: PermissionFlag) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { role: true },
    });
    if (!user) return res.status(401).json({ error: "Не авторизован" });
    if (user.role?.name === "OWNER") return next();
    if (user.role && (user.role as any)[flag]) return next();
    return res.status(403).json({ error: "Недостаточно прав для этого действия" });
  };
}
