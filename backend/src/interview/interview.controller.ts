import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ZodValidationPipe } from '../vacancies/schemas/zod-validation.pipe';
import { SessionsService } from './sessions.service';
import {
  CreateSessionSchema,
  type CreateSessionDto,
  SubmitAnswerSchema,
  type SubmitAnswerDto,
} from './schemas/interview.schema';

@Controller('interview/sessions')
export class InterviewController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: { user: AuthenticatedUser },
    @Body(new ZodValidationPipe(CreateSessionSchema)) dto: CreateSessionDto,
  ) {
    return this.sessions.create(req.user.id, dto);
  }

  @Get()
  async findAll(@Request() req: { user: AuthenticatedUser }) {
    return this.sessions.findMany(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.sessions.findOne(req.user.id, id);
  }

  @Post(':id/answers')
  @HttpCode(HttpStatus.CREATED)
  async submitAnswer(
    @Request() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SubmitAnswerSchema)) dto: SubmitAnswerDto,
  ) {
    return this.sessions.submitAnswer(req.user.id, id, dto);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  async generateReport(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.sessions.generateReport(req.user.id, id);
  }

  @Get(':id/report')
  async getReport(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    const report = await this.sessions.getReport(req.user.id, id);
    if (!report) throw new NotFoundException('Relatório ainda não gerado para esta sessão.');
    return report;
  }
}
