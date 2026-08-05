import { Test, TestingModule } from '@nestjs/testing';
import {
  VacancyParserService,
  AiProviderPort,
  VacancyParseError,
  AiError,
} from './vacancy-parser.service';

const TECH_VACANCY = `
Vaga: Desenvolvedor Node.js Pleno
Buscamos desenvolvedor para atuar no backend com Node.js, TypeScript, PostgreSQL, Docker e AWS.
Diferenciais: NestJS, Kubernetes, Redis.
Responsabilidades: projetar APIs REST, revisar código, participar de refinamentos.
`;

describe('VacancyParserService', () => {
  let service: VacancyParserService;
  let ai: jest.Mocked<AiProviderPort>;

  beforeEach(async () => {
    ai = { complete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VacancyParserService, { provide: AiProviderPort, useValue: ai }],
    }).compile();

    service = module.get(VacancyParserService);
  });

  it('extrai tecnologias, senioridade e competências em vaga tech', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify({
        technologies: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS'],
        seniorityLevel: 'mid',
        keyCompetencies: ['APIs REST', 'revisão de código'],
        confidence: 'high',
        outOfScope: false,
      }),
    );

    const result = await service.parse(TECH_VACANCY);

    expect(result.technologies).toEqual(expect.arrayContaining(['Node.js', 'TypeScript']));
    expect(result.seniorityLevel).toBe('mid');
    expect(result.confidence).toBe('high');
    expect(result.outOfScope).toBe(false);
  });

  it('propaga invalid_api_key vindo do provedor', async () => {
    ai.complete.mockRejectedValue(new AiError('invalid_api_key', 'chave recusada'));

    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({
      name: 'VacancyParseError',
      reason: 'invalid_api_key',
    });
  });

  it('propaga timeout vindo do provedor', async () => {
    ai.complete.mockRejectedValue(new AiError('timeout', 'demorou demais'));

    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('traduz unavailable do provedor para ai_unavailable', async () => {
    ai.complete.mockRejectedValue(new AiError('unavailable', 'rede caiu'));

    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({
      reason: 'ai_unavailable',
    });
  });

  it('propaga rate_limited vindo do provedor', async () => {
    ai.complete.mockRejectedValue(new AiError('rate_limited', 'limite estourado'));

    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({ reason: 'rate_limited' });
  });

  it('propaga payment_required vindo do provedor', async () => {
    ai.complete.mockRejectedValue(new AiError('payment_required', 'sem créditos'));

    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({
      reason: 'payment_required',
    });
  });

  it('usa ai_unavailable quando o erro não é um AiError', async () => {
    ai.complete.mockRejectedValue(new Error('boom'));

    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({
      reason: 'ai_unavailable',
    });
  });

  it('lança invalid_response quando a IA retorna JSON inválido', async () => {
    ai.complete.mockResolvedValue('resposta em texto livre sem JSON');

    await expect(service.parse(TECH_VACANCY)).rejects.toBeInstanceOf(VacancyParseError);
    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({
      reason: 'invalid_response',
    });
  });

  it('lança invalid_response quando o JSON não bate com o schema', async () => {
    ai.complete.mockResolvedValue(JSON.stringify({ technologies: 'React' }));

    await expect(service.parse(TECH_VACANCY)).rejects.toMatchObject({
      reason: 'invalid_response',
    });
  });

  it('usa .catch() do Zod e retorna confiança baixa para campos inválidos', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify({
        technologies: ['React'],
        seniorityLevel: 'ninja',
        keyCompetencies: [],
        confidence: 'high',
        outOfScope: false,
      }),
    );

    const result = await service.parse(TECH_VACANCY);

    expect(result.seniorityLevel).toBe('unknown');
    expect(result.technologies).toEqual(['React']);
  });

  it('respeita outOfScope=true retornado pela IA', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify({
        technologies: [],
        seniorityLevel: 'unknown',
        keyCompetencies: [],
        confidence: 'low',
        outOfScope: true,
      }),
    );

    const borderline = 'Profissional com experiência em software de gestão para área comercial.';
    const result = await service.parse(borderline);

    expect(result.outOfScope).toBe(true);
  });

  it('força confidence=low quando technologies está vazio', async () => {
    ai.complete.mockResolvedValue(
      JSON.stringify({
        technologies: [],
        seniorityLevel: 'junior',
        keyCompetencies: ['trabalho em equipe'],
        confidence: 'high',
        outOfScope: false,
      }),
    );

    const vague = 'Programador experiente necessário para empresa de tecnologia em crescimento.';
    const result = await service.parse(vague);

    expect(result.confidence).toBe('low');
  });
});
