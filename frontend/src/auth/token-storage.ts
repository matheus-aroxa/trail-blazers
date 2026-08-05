import { TOKEN_STORAGE_KEY } from "./auth-context";

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {}
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
}
