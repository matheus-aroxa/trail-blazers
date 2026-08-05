import { Controller, Post, Get, Param, Body, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { VacanciesService } from './vacancies.service';
import { type CreateVacancyDto, CreateVacancySchema } from './schemas/vacancy.schema';
import { ZodValidationPipe } from './schemas/zod-validation.pipe';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('vacancies')
export class VacanciesController {
  constructor(private readonly service: VacanciesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: { user: AuthenticatedUser },
    @Body(new ZodValidationPipe(CreateVacancySchema)) dto: CreateVacancyDto,
  ) {
    return this.service.create(req.user.id, dto);
  }

  @Get(':id')
  async findOne(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.service.findOne(id, req.user.id);
  }

  @Post(':id/reparse')
  @HttpCode(HttpStatus.ACCEPTED)
  async reparse(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.service.reparse(id, req.user.id);
  }

  @Get()
  async findAll(@Request() req: { user: AuthenticatedUser }) {
    return this.service.findAllByUser(req.user.id);
  }
}
