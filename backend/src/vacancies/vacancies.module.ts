import { Module } from '@nestjs/common';
import { VacanciesService } from './vacancies.service';
import { VacanciesController } from './vacancies.controller';

@Module({
  controllers: [VacanciesController],
  providers: [VacanciesService],
})
export class VacanciesModule {}
