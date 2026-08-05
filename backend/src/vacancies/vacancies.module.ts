import { Module } from '@nestjs/common';
import { VacanciesService } from './vacancies.service';
import { VacanciesController } from './vacancies.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [VacanciesService],
  controllers: [VacanciesController],
  exports: [VacanciesService],
})
export class VacanciesModule {}
