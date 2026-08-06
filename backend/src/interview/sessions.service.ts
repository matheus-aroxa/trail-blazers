import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type Question, type Session, type SessionRepo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoriesService } from '../repos/repos.service';
import { ParsedVacancyProfile } from '../vacancies/schemas/vacancy.schema';
import { CreateSessionDto, SubmitAnswerDto } from './schemas/interview.schema';
import { QuestionGenerationError, QuestionGeneratorService } from './question-generator.service';
import { ReportGenerationError, ReportGeneratorService } from './report-generator.service';

const NON_RETRYABLE_REASONS = new Set(['invalid_api_key', 'payment_required']);

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repositoriesService: RepositoriesService,
    private readonly questionGenerator: QuestionGeneratorService,
    private readonly reportGenerator: ReportGeneratorService,
  ) {}

  async create(userId: string, dto: CreateSessionDto) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id: dto.vacancyId, userId },
    });
    if (!vacancy) throw new NotFoundException('Vaga não encontrada.');

    if (vacancy.parseStatus === 'pending') {
      throw new HttpException(
        {
          code: 'vaga_ainda_analisando',
          message: 'A análise da vaga ainda não terminou. Aguarde para escolher o repositório.',
        },
        HttpStatus.CONFLICT,
      );
    }

    if (vacancy.parseStatus === 'failed' || vacancy.parsedOutOfScope) {
      throw new HttpException(
        {
          code: 'vaga_sem_perfil',
          message:
            'Não foi possível extrair um perfil técnico desta vaga. Tente reanalisar a vaga ou edite a descrição.',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const profile: ParsedVacancyProfile = {
      technologies: (vacancy.parsedStack ?? []) as string[],
      seniorityLevel: (vacancy.parsedSeniority ??
        'unknown') as ParsedVacancyProfile['seniorityLevel'],
      keyCompetencies: (vacancy.parsedSkills ?? []) as string[],
      confidence: vacancy.parseConfidence === 1.0 ? 'high' : 'low',
      outOfScope: vacancy.parsedOutOfScope ?? false,
    };

    const analysis = await this.repositoriesService.analyzeRepositoryContent(
      userId,
      dto.owner,
      dto.repo,
      dto.vacancyId,
    );

    let questions;
    try {
      questions = await this.questionGenerator.generate({
        rawDescription: vacancy.rawDescription,
        profile,
        files: analysis.relevantFiles,
        count: dto.questionCount,
      });
    } catch (err) {
      throw this.mapAiError(err, 'ia_indisponivel_perguntas');
    }

    const estimatedInputChars =
      vacancy.rawDescription.length +
      analysis.relevantFiles.reduce((sum, file) => sum + file.content.length, 0);
    const estimatedOutputChars = questions.reduce((sum, q) => sum + q.content.length, 0);

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId,
          vacancyId: dto.vacancyId,
          status: 'in_progress',
          totalInputTokens: Math.ceil(estimatedInputChars / 4),
          totalOutputTokens: Math.ceil(estimatedOutputChars / 4),
        },
      });

      const sessionRepo = await tx.sessionRepo.create({
        data: {
          sessionId: created.id,
          repoFullName: `${dto.owner}/${dto.repo}`,
          repoUrl: `https://github.com/${dto.owner}/${dto.repo}`,
          selectedFilesSnapshot: analysis.relevantFiles.map((f) => f.path),
        },
      });

      const createdQuestions = await Promise.all(
        questions.map((question, index) =>
          tx.question.create({
            data: {
              sessionId: created.id,
              sessionRepoId: sessionRepo.id,
              type: question.type,
              orderIndex: index + 1,
              content: question.content,
              metadata:
                question.codeExcerpt || question.codeFile
                  ? { codeFile: question.codeFile, codeExcerpt: question.codeExcerpt }
                  : undefined,
            },
          }),
        ),
      );

      return { session: created, sessionRepo, questions: createdQuestions };
    });

    return this.toSessionResponse(session.session, session.sessionRepo, session.questions, {
      fileCount: analysis.relevantFiles.length,
      omittedCount: analysis.omittedFiles.length,
      topFiles: analysis.relevantFiles.slice(0, 5).map((f) => f.path),
    });
  }

  async findOne(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        repos: true,
        questions: { orderBy: { orderIndex: 'asc' }, include: { answer: true } },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada.');

    return this.toSessionResponse(session, session.repos[0] ?? null, session.questions);
  }

  async submitAnswer(userId: string, sessionId: string, dto: SubmitAnswerDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { questions: { include: { answer: true } } },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada.');

    const question = session.questions.find((q) => q.id === dto.questionId);
    if (!question) throw new NotFoundException('Pergunta não encontrada nesta sessão.');

    if (question.answer) {
      return {
        answer: {
          id: question.answer.id,
          questionId: question.id,
          content: question.answer.content,
        },
        allAnswered: session.questions.every((q) => q.answer || q.id === question.id),
      };
    }

    const answer = await this.prisma.answer.create({
      data: { questionId: question.id, content: dto.content },
    });

    const allAnswered = session.questions.every((q) => q.id === question.id || q.answer);

    if (allAnswered && session.status === 'in_progress') {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: 'evaluating' },
      });
    }

    return {
      answer: { id: answer.id, questionId: question.id, content: answer.content },
      allAnswered,
    };
  }

  async generateReport(userId: string, sessionId: string) {
    const existing = await this.getReport(userId, sessionId);
    if (existing) return existing;

    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        vacancy: true,
        questions: { orderBy: { orderIndex: 'asc' }, include: { answer: true } },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada.');

    const unanswered = session.questions.filter((q) => !q.answer);
    if (unanswered.length > 0) {
      throw new HttpException(
        {
          code: 'respostas_pendentes',
          message: 'Responda todas as perguntas antes de gerar o relatório.',
        },
        HttpStatus.CONFLICT,
      );
    }

    const profile: ParsedVacancyProfile = {
      technologies: (session.vacancy.parsedStack ?? []) as string[],
      seniorityLevel: (session.vacancy.parsedSeniority ??
        'unknown') as ParsedVacancyProfile['seniorityLevel'],
      keyCompetencies: (session.vacancy.parsedSkills ?? []) as string[],
      confidence: session.vacancy.parseConfidence === 1.0 ? 'high' : 'low',
      outOfScope: session.vacancy.parsedOutOfScope ?? false,
    };

    let report;
    try {
      report = await this.reportGenerator.generate({
        rawDescription: session.vacancy.rawDescription,
        profile,
        answeredQuestions: session.questions.map((q) => ({
          type: q.type,
          content: q.content,
          answer: q.answer?.content ?? '',
        })),
      });
    } catch (err) {
      throw this.mapAiError(err, 'ia_indisponivel_relatorio');
    }

    let created;
    try {
      created = await this.prisma.report.create({
        data: {
          sessionId,
          overallScore: report.overallScore,
          adherenceScore: report.adherenceScore,
          dimensionScores: report.dimensionScores,
          strengths: report.strengths,
          gaps: report.gaps,
          recommendations: report.recommendations,
        },
      });
    } catch (err) {
      // Duas chamadas concorrentes (ex.: efeito duplicado do React em dev) podem
      // passar juntas pelo cheque de "já existe" antes de qualquer uma commitar.
      // Quem perder a corrida devolve o relatório que a outra já criou.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const race = await this.prisma.report.findUnique({ where: { sessionId } });
        if (race) return this.toReportResponse(race, sessionId);
      }
      throw err;
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'completed', completedAt: new Date() },
    });

    return this.toReportResponse(created, sessionId);
  }

  async getReport(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { report: true },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada.');

    return session.report ? this.toReportResponse(session.report, sessionId) : null;
  }

  private mapAiError(err: unknown, code: string): HttpException {
    const reason =
      err instanceof QuestionGenerationError || err instanceof ReportGenerationError
        ? err.reason
        : 'ai_unavailable';
    const message = err instanceof Error ? err.message : 'A IA não respondeu.';
    const retryable = !NON_RETRYABLE_REASONS.has(reason);

    this.logger.error(`Falha de IA [${code}]: ${message}`);

    return new HttpException({ code, message, retryable }, HttpStatus.BAD_GATEWAY);
  }

  private toSessionResponse(
    session: Session,
    sessionRepo: SessionRepo | null,
    questions: (Question & { answer?: { content: string; createdAt: Date } | null })[],
    repoAnalysis?: { fileCount: number; omittedCount: number; topFiles: string[] },
  ) {
    return {
      id: session.id,
      status: session.status,
      vacancyId: session.vacancyId,
      repo: sessionRepo
        ? {
            fullName: sessionRepo.repoFullName,
            url: sessionRepo.repoUrl,
            primaryLanguage: sessionRepo.primaryLanguage,
          }
        : null,
      repoAnalysis,
      questions: questions.map((question) => ({
        id: question.id,
        orderIndex: question.orderIndex,
        type: question.type,
        content: question.content,
        metadata: question.metadata as { codeFile?: string; codeExcerpt?: string } | null,
        answer: question.answer
          ? { content: question.answer.content, createdAt: question.answer.createdAt }
          : null,
      })),
    };
  }

  private toReportResponse(
    report: {
      overallScore: number;
      adherenceScore: number;
      dimensionScores: unknown;
      strengths: unknown;
      gaps: unknown;
      recommendations: unknown;
      createdAt: Date;
    },
    sessionId: string,
  ) {
    return {
      sessionId,
      overallScore: report.overallScore,
      adherenceScore: report.adherenceScore,
      dimensionScores: report.dimensionScores as { label: string; score: number }[],
      strengths: report.strengths as { title: string; text: string }[],
      gaps: report.gaps as { title: string; text: string }[],
      recommendations: report.recommendations as { title: string; text: string }[],
      createdAt: report.createdAt,
    };
  }
}
