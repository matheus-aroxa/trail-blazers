export type AuthenticatedUser = {
  id: string;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
};
