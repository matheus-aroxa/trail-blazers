export type JwtPayload = {
  sub: string;
  username: string;
  email?: string;
  avatarUrl?: string;
};
