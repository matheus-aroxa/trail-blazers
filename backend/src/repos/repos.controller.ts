import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { RepositoriesService } from './repos.service';
import { RepositorySummary } from './types/repos-summary';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  async list(@Req() req: Request): Promise<RepositorySummary[]> {
    const user = req.user as AuthenticatedUser;
    return this.repositoriesService.listForUser(user.id);
  }

  @Get(':owner/:repo/analyze')
  async analyze(
    @Req() req: Request,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('vacancyId') vacancyId: string,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.repositoriesService.analyzeRepositoryContent(user.id, owner, repo, vacancyId);
  }
}
