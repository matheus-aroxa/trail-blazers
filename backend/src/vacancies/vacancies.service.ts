import { Injectable } from '@nestjs/common';
import { Vacancy } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';

@Injectable()
export class VacanciesService {
  constructor(private readonly prisma: PrismaService) {}

  // a descrição é gravada como texto puro; o parse da stack/senioridade vem depois
  async create(userId: string, createVacancyDto: CreateVacancyDto): Promise<Vacancy> {
    return this.prisma.vacancy.create({
      data: {
        userId,
        rawDescription: createVacancyDto.description,
      },
    });
  }
}
