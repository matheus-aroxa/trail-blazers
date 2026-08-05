import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  decodeJwt,
  getExpiresAt,
  isExpired,
  type JwtPayload,
} from "../lib/jwt";
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
  type SessionEndReason,
} from "./auth-context";
import { clearToken, readToken, writeToken } from "./token-storage";

interface Session {
  user: AuthUser;
  expiresAt: number | null;
}

function toSession(token: string): Session | null {
  const payload = decodeJwt(token);

  if (!payload || isExpired(payload)) {
    return null;
  }

  return { user: toUser(payload), expiresAt: getExpiresAt(payload) };
}

function toUser(payload: JwtPayload): AuthUser {
  return {
    id: payload.sub,
    username: payload.username,
    email: payload.email,
    avatarUrl: payload.avatarUrl,
  };
}

function readStoredSession(): Session | null {
  const token = readToken();

  if (!token) {
    return null;
  }

  const session = toSession(token);

  if (!session) {
    clearToken();
  }

  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);
  const [sessionEndReason, setSessionEndReason] =
    useState<SessionEndReason | null>(null);

  const signOut = useCallback((reason?: SessionEndReason) => {
    clearToken();
    setSession(null);
    setSessionEndReason(reason ?? null);
  }, []);

  const signIn = useCallback((accessToken: string) => {
    const nextSession = toSession(accessToken);

    if (!nextSession) {
      clearToken();
      setSession(null);
      setSessionEndReason("invalid");
      return false;
    }

    writeToken(accessToken);
    setSession(nextSession);
    setSessionEndReason(null);
    return true;
  }, []);

  useEffect(() => {
    if (!session?.expiresAt) {
      return;
    }

    const timeout = window.setTimeout(
      () => signOut("expired"),
      Math.max(0, session.expiresAt - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [session, signOut]);

  const clearSessionEndReason = useCallback(
    () => setSessionEndReason(null),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      sessionEndReason,
      signIn,
      signOut,
      clearSessionEndReason,
    }),
    [session, sessionEndReason, signIn, signOut, clearSessionEndReason],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
