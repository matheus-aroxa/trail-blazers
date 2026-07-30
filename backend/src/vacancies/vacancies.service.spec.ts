import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VacanciesService } from './vacancies.service';

describe('VacanciesService', () => {
  let service: VacanciesService;

  const prismaMock = {
    vacancy: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [VacanciesService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<VacanciesService>(VacanciesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('grava a vaga vinculada ao usuário, com a descrição em raw_description', async () => {
    const vacancy = { id: 'uuid-1', userId: 'user-1', rawDescription: 'descrição da vaga' };
    prismaMock.vacancy.create.mockResolvedValue(vacancy);

    const result = await service.create('user-1', { description: 'descrição da vaga' });

    expect(prismaMock.vacancy.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', rawDescription: 'descrição da vaga' },
    });
    expect(result).toBe(vacancy);
  });
});
