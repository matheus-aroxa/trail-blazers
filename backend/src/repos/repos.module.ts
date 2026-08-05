import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '@users/users.module';
import { RepositoriesController } from './repos.controller';
import { RepositoriesService } from './repos.service';

@Module({
  imports: [
    UsersModule,
    CacheModule.register({
      ttl: 300_000,
      max: 100,
    }),
  ],
  controllers: [RepositoriesController],
  providers: [RepositoriesService],
})
export class RepositoriesModule {}
