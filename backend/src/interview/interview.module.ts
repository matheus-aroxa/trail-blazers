import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RepositoriesModule } from '../repos/repos.module';
import { InterviewController } from './interview.controller';
import { SessionsService } from './sessions.service';
import { QuestionGeneratorService } from './question-generator.service';
import { ReportGeneratorService } from './report-generator.service';

@Module({
  imports: [AiModule, RepositoriesModule],
  controllers: [InterviewController],
  providers: [SessionsService, QuestionGeneratorService, ReportGeneratorService],
})
export class InterviewModule {}
