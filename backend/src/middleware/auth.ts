import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  userId?: string;
  workspaceId?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Не авторизован" });
  }
  try {
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Пользователь не найден или деактивирован" });
    }
    req.userId = payload.userId;
    req.workspaceId = payload.workspaceId;
    next();
  } catch {
    return res.status(401).json({ error: "Неверный или просроченный токен" });
  }
}
