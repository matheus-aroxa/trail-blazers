import { API_URL } from "../lib/env";

const REDIRECT_STORAGE_KEY = "interviewtrail:redirect-after-login";

export function startGithubOAuth(redirectTo?: string): void {
  if (redirectTo) {
    try {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, redirectTo);
    } catch {}
  }

  window.location.href = `${API_URL}/auth/github`;
}

export function consumeRedirectAfterLogin(): string | null {
  try {
    const redirectTo = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
    sessionStorage.removeItem(REDIRECT_STORAGE_KEY);

    return redirectTo?.startsWith("/") ? redirectTo : null;
  } catch {
    return null;
  }
}
