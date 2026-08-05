import { createContext } from "react";

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  sessionEndReason: SessionEndReason | null;
  signIn: (accessToken: string) => boolean;
  signOut: (reason?: SessionEndReason) => void;
  clearSessionEndReason: () => void;
}

export type SessionEndReason = "expired" | "invalid";

export const AuthContext = createContext<AuthContextValue | null>(null);

export const TOKEN_STORAGE_KEY = "interviewtrail:token";
