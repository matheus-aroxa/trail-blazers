import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VacanciesService } from './vacancies.service';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyParseError, VacancyParserService } from './vacancy-parser.service';
import { VACANCY_MIN_LENGTH, type ParsedVacancyProfile } from './schemas/vacancy.schema';

const USER_ID = 'user-abc';
const VALID_DESC = 'a'.repeat(VACANCY_MIN_LENGTH + 10);

const GENERIC_PROFILE: ParsedVacancyProfile = {
  technologies: [],
  seniorityLevel: 'unknown',
  keyCompetencies: [],
  confidence: 'low',
  outOfScope: false,
};

const TECH_PROFILE: ParsedVacancyProfile = {
  technologies: ['Node.js', 'TypeScript'],
  seniorityLevel: 'mid',
  keyCompetencies: ['APIs REST'],
  confidence: 'high',
  outOfScope: false,
};

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'vaga-1',
  userId: USER_ID,
  rawDescription: VALID_DESC,
  parsedStack: null,
  parsedSeniority: null,
  parsedSkills: null,
  parseConfidence: null,
  parsedOutOfScope: null,
  parseStatus: 'pending',
  parseFailureReason: null,
  createdAt: new Date(),
  ...overrides,
});

const flushBackground = () => new Promise((r) => setTimeout(r, 20));

const lastUpdateData = (update: jest.Mock): Record<string, unknown> => {
  const call = update.mock.calls.at(-1) as [{ data: Record<string, unknown> }] | undefined;
  return call?.[0].data ?? {};
};

describe('VacanciesService', () => {
  let service: VacanciesService;
  let prisma: { vacancy: Record<string, jest.Mock> };
  let parser: jest.Mocked<VacancyParserService>;

  beforeEach(async () => {
    prisma = {
      vacancy: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    parser = { parse: jest.fn() } as unknown as jest.Mocked<VacancyParserService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VacanciesService,
        { provide: PrismaService, useValue: prisma },
        { provide: VacancyParserService, useValue: parser },
      ],
    }).compile();

    service = module.get(VacanciesService);
  });

  it('cria vaga e retorna imediatamente com parsingCompleted=false', async () => {
    prisma.vacancy.create.mockResolvedValue(makeRow());
    parser.parse.mockResolvedValue(GENERIC_PROFILE);
    prisma.vacancy.update.mockResolvedValue(undefined);

    const result = await service.create(USER_ID, { description: VALID_DESC });

    expect(result.id).toBe('vaga-1');
    expect(result.parsingCompleted).toBe(false);
    expect(result.parsedProfile).toBeNull();
    expect(prisma.vacancy.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, rawDescription: VALID_DESC },
    });
  });

  it('grava o perfil analisado no banco após o parsing', async () => {
    prisma.vacancy.create.mockResolvedValue(makeRow());
    parser.parse.mockResolvedValue(TECH_PROFILE);
    prisma.vacancy.update.mockResolvedValue(undefined);

    await service.create(USER_ID, { description: VALID_DESC });
    await flushBackground();

    expect(prisma.vacancy.update).toHaveBeenCalledWith({
      where: { id: 'vaga-1' },
      data: {
        parsedStack: ['Node.js', 'TypeScript'],
        parsedSeniority: 'mid',
        parsedSkills: ['APIs REST'],
        parseConfidence: 1.0,
        parsedOutOfScope: false,
        parseStatus: 'done',
        parseFailureReason: null,
      },
    });
  });

  it('persiste outOfScope=true para vaga fora do escopo tech', async () => {
    prisma.vacancy.create.mockResolvedValue(makeRow());
    parser.parse.mockResolvedValue({ ...GENERIC_PROFILE, outOfScope: true });
    prisma.vacancy.update.mockResolvedValue(undefined);

    await service.create(USER_ID, { description: VALID_DESC });
    await flushBackground();

    expect(lastUpdateData(prisma.vacancy.update).parsedOutOfScope).toBe(true);
  });

  it('não rejeita o cadastro quando o parser lança', async () => {
    prisma.vacancy.create.mockResolvedValue(makeRow());
    parser.parse.mockRejectedValue(new Error('boom'));
    prisma.vacancy.update.mockResolvedValue(undefined);

    const result = await service.create(USER_ID, { description: VALID_DESC });
    await flushBackground();

    expect(result.id).toBe('vaga-1');
  });

  it('marca a vaga como failed quando o parser lança, sem gravar perfil falso', async () => {
    prisma.vacancy.create.mockResolvedValue(makeRow());
    parser.parse.mockRejectedValue(new VacancyParseError('ai_unavailable', 'IA fora do ar'));
    prisma.vacancy.update.mockResolvedValue(undefined);

    await service.create(USER_ID, { description: VALID_DESC });
    await flushBackground();

    const data = lastUpdateData(prisma.vacancy.update);
    expect(data.parseStatus).toBe('failed');
    expect(data.parseFailureReason).toBe('ai_unavailable');
    expect(data.parseConfidence).toBeUndefined();
    expect(data.parsedStack).toBeUndefined();
  });

  it('usa reason=unknown quando o erro não é um VacancyParseError', async () => {
    prisma.vacancy.create.mockResolvedValue(makeRow());
    parser.parse.mockRejectedValue(new Error('boom'));
    prisma.vacancy.update.mockResolvedValue(undefined);

    await service.create(USER_ID, { description: VALID_DESC });
    await flushBackground();

    expect(lastUpdateData(prisma.vacancy.update).parseFailureReason).toBe('unknown');
  });

  it('devolve parsedProfile nulo e parsingCompleted=true para vaga com falha', async () => {
    prisma.vacancy.findFirst.mockResolvedValue(
      makeRow({ parseStatus: 'failed', parseFailureReason: 'ai_unavailable' }),
    );

    const result = await service.findOne('vaga-1', USER_ID);

    expect(result.parseStatus).toBe('failed');
    expect(result.parseFailureReason).toBe('ai_unavailable');
    expect(result.parsedProfile).toBeNull();
    expect(result.parsingCompleted).toBe(true);
  });

  it('não derruba o processo quando a gravação no banco falha', async () => {
    prisma.vacancy.create.mockResolvedValue(makeRow());
    parser.parse.mockResolvedValue(GENERIC_PROFILE);
    prisma.vacancy.update.mockRejectedValue(new Error('db fora do ar'));

    await expect(service.create(USER_ID, { description: VALID_DESC })).resolves.toBeDefined();
    await flushBackground();
  });

  it('lança NotFoundException para vaga inexistente', async () => {
    prisma.vacancy.findFirst.mockResolvedValue(null);

    await expect(service.findOne('id-errado', USER_ID)).rejects.toThrow(NotFoundException);
  });

  it('reconstrói o parsedProfile a partir das colunas do banco', async () => {
    prisma.vacancy.findFirst.mockResolvedValue(
      makeRow({
        parsedStack: ['Node.js', 'TypeScript'],
        parsedSeniority: 'mid',
        parsedSkills: ['APIs REST'],
        parseConfidence: 1.0,
        parseStatus: 'done',
      }),
    );

    const result = await service.findOne('vaga-1', USER_ID);

    expect(result.parsingCompleted).toBe(true);
    expect(result.parsedProfile).toEqual(TECH_PROFILE);
    expect(prisma.vacancy.findFirst).toHaveBeenCalledWith({
      where: { id: 'vaga-1', userId: USER_ID },
    });
  });

  it('devolve outOfScope=true quando a coluna está marcada', async () => {
    prisma.vacancy.findFirst.mockResolvedValue(
      makeRow({ parseConfidence: 0.5, parsedOutOfScope: true, parseStatus: 'done' }),
    );

    const result = await service.findOne('vaga-1', USER_ID);

    expect(result.parsedProfile?.outOfScope).toBe(true);
  });

  describe('reparse', () => {
    it('limpa o resultado anterior e dispara a análise de novo', async () => {
      const failed = makeRow({ parseStatus: 'failed', parseFailureReason: 'timeout' });
      prisma.vacancy.findFirst.mockResolvedValue(failed);
      prisma.vacancy.update.mockResolvedValue(makeRow({ parseStatus: 'pending' }));
      parser.parse.mockResolvedValue(TECH_PROFILE);

      const result = await service.reparse('vaga-1', USER_ID);

      expect(result.parseStatus).toBe('pending');
      expect(result.parsedProfile).toBeNull();

      const reset = prisma.vacancy.update.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(reset[0].data).toEqual({
        parseStatus: 'pending',
        parseFailureReason: null,
        parsedStack: Prisma.DbNull,
        parsedSeniority: null,
        parsedSkills: Prisma.DbNull,
        parseConfidence: null,
        parsedOutOfScope: null,
      });

      await flushBackground();
      expect(parser.parse.mock.calls).toEqual([[VALID_DESC]]);
      expect(lastUpdateData(prisma.vacancy.update).parseStatus).toBe('done');
    });

    it('recusa reprocessar uma vaga de outro usuário', async () => {
      prisma.vacancy.findFirst.mockResolvedValue(null);

      await expect(service.reparse('vaga-1', 'outro-user')).rejects.toThrow(NotFoundException);
      expect(prisma.vacancy.update).not.toHaveBeenCalled();
    });

    it('recusa reprocessar quando a análise ainda está em andamento', async () => {
      prisma.vacancy.findFirst.mockResolvedValue(makeRow({ parseStatus: 'pending' }));

      await expect(service.reparse('vaga-1', USER_ID)).rejects.toThrow(ConflictException);
      expect(prisma.vacancy.update).not.toHaveBeenCalled();
    });

    it('grava a nova falha quando a reanálise também falha', async () => {
      prisma.vacancy.findFirst.mockResolvedValue(makeRow({ parseStatus: 'failed' }));
      prisma.vacancy.update.mockResolvedValue(makeRow({ parseStatus: 'pending' }));
      parser.parse.mockRejectedValue(new VacancyParseError('invalid_api_key', 'chave ruim'));

      await service.reparse('vaga-1', USER_ID);
      await flushBackground();

      expect(lastUpdateData(prisma.vacancy.update).parseFailureReason).toBe('invalid_api_key');
    });
  });

  it('retorna lista de vagas do usuário em ordem decrescente', async () => {
    prisma.vacancy.findMany.mockResolvedValue([makeRow({ id: 'v2' }), makeRow({ id: 'v1' })]);

    const result = await service.findAllByUser(USER_ID);

    expect(result).toHaveLength(2);
    expect(prisma.vacancy.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  });
});
