import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';

describe('VacanciesController', () => {
  let controller: VacanciesController;

  const serviceMock = {
    create: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 'user-1',
    githubId: '123',
    username: 'john',
    email: null,
    avatarUrl: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VacanciesController],
      providers: [{ provide: VacanciesService, useValue: serviceMock }],
    }).compile();

    controller = module.get<VacanciesController>(VacanciesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('cria a vaga para o usuário autenticado', async () => {
    const vacancy = { id: 'uuid-1' };
    serviceMock.create.mockResolvedValue(vacancy);
    const dto = { description: 'descrição da vaga' };

    const result = await controller.create({ user } as unknown as Request, dto);

    expect(serviceMock.create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toBe(vacancy);
  });
});
