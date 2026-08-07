import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';
import { RepositoriesController } from './repos.controller';
import { RepositoriesService } from './repos.service';
import { RepoFileSelectorService } from './repo-file-selector.service';

@Module({
  imports: [
    UsersModule,
    AiModule,
    CacheModule.register({
      ttl: 300_000,
      max: 100,
    }),
  ],
  controllers: [RepositoriesController],
  providers: [RepositoriesService, RepoFileSelectorService],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
