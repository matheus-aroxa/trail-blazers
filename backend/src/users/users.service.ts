import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { GithubUser } from '../auth/types/github-user';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsertFromGithub(githubUser: GithubUser): Promise<User> {
    const data = {
      username: githubUser.username,
      email: githubUser.email ?? null,
      avatarUrl: githubUser.avatarUrl ?? null,
      githubTokenEncrypted: this.encryption.encrypt(githubUser.accessToken),
    };

    return this.prisma.user.upsert({
      where: { githubId: githubUser.githubId },
      update: data,
      create: { githubId: githubUser.githubId, ...data },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { githubId } });
  }

  async getGithubToken(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubTokenEncrypted: true },
    });

    if (!user?.githubTokenEncrypted) {
      return null;
    }

    return this.encryption.decrypt(user.githubTokenEncrypted);
  }
}
