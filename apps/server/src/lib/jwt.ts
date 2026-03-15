import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "dev_secret_change_in_production";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  sub: string;       // operator ID
  workspaceId: string;
  workspaceKey: string;
  email: string;
  name?: string;     // nombre del operador (opcional, retrocompatible)
  role: "owner" | "agent";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
