import { createHmac, timingSafeEqual } from "crypto";

// Sessão stateless pro /admin: um único usuário, sem tabela no banco.
// O cookie carrega "<expiresAtMs>.<hmac>" assinado com ADMIN_SESSION_SECRET;
// validar é só recalcular o HMAC e comparar em tempo constante.
export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function createSessionCookieValue(): string {
  const payload = String(Date.now() + SESSION_TTL_MS);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(
  value: string | undefined | null,
): boolean {
  if (!value) return false;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  if (!timingSafeEqualStrings(signature, sign(payload))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  return timingSafeEqualStrings(password, expected);
}
