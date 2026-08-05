import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenRouterProvider } from './openrouter.provider';
import { AiProviderPort, VacancyParserService } from '../vacancies/vacancy-parser.service';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: AiProviderPort, useClass: OpenRouterProvider }, VacancyParserService],
  exports: [VacancyParserService],
})
export class AiModule {}
