import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export interface JwtPayload {
  userId: string;
  workspaceId: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
