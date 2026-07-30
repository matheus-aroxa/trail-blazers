import { Body, Controller, Post, Req } from '@nestjs/common';
import { Vacancy } from '@prisma/client';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { VacanciesService } from './vacancies.service';

@Controller('vacancies')
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Post()
  async create(@Req() req: Request, @Body() createVacancyDto: CreateVacancyDto): Promise<Vacancy> {
    // a vaga pertence ao usuário do JWT; o guard global garante que ele existe
    const user = req.user as AuthenticatedUser;
    return this.vacanciesService.create(user.id, createVacancyDto);
  }
}
