import { randomBytes } from "crypto";

interface TokenData {
  userId: number;
  userRole: string;
  userEmail: string;
}

// In-memory token store (survives until server restart)
const tokens = new Map<string, TokenData>();

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function setToken(token: string, data: TokenData): void {
  tokens.set(token, data);
}

export function getToken(token: string): TokenData | null {
  return tokens.get(token) ?? null;
}

export function deleteToken(token: string): void {
  tokens.delete(token);
}
