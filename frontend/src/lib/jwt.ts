export interface JwtPayload {
  sub: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  exp?: number;
  iat?: number;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.sub === "string" && typeof payload.username === "string"
  );
}

export function decodeJwt(token: string): JwtPayload | null {
  const segments = token.split(".");

  if (segments.length !== 3) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(decodeBase64Url(segments[1]));
    return isJwtPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function getExpiresAt(payload: JwtPayload): number | null {
  return typeof payload.exp === "number" ? payload.exp * 1000 : null;
}

export function isExpired(payload: JwtPayload, now = Date.now()): boolean {
  const expiresAt = getExpiresAt(payload);
  return expiresAt !== null && expiresAt <= now;
}
