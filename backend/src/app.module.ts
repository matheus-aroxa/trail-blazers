import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './crypto/crypto.module';
import { RepositoriesModule } from './repos/repos.module';
import { VacanciesModule } from './vacancies/vacancies.module';
import { AiModule } from './ai/ai.module';
import { InterviewModule } from './interview/interview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    PrismaModule,
    CryptoModule,
    UsersModule,
    AuthModule,
    RepositoriesModule,
    VacanciesModule,
    AiModule,
    InterviewModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
