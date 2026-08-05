import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const encryptionMock = {
    encrypt: jest.fn((value: string) => `enc(${value})`),
    decrypt: jest.fn((value: string) => value.replace(/^enc\((.*)\)$/, '$1')),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EncryptionService, useValue: encryptionMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('faz upsert do usuário pelo githubId e grava o token criptografado', async () => {
    const user = { id: 'uuid-1', githubId: '123', username: 'john' };
    prismaMock.user.upsert.mockResolvedValue(user);

    const result = await service.upsertFromGithub({
      githubId: '123',
      username: 'john',
      email: 'john@example.com',
      avatarUrl: 'https://avatar',
      accessToken: 'gho_token',
    });

    expect(result).toBe(user);
    expect(encryptionMock.encrypt).toHaveBeenCalledWith('gho_token');

    const data = {
      username: 'john',
      email: 'john@example.com',
      avatarUrl: 'https://avatar',
      githubTokenEncrypted: 'enc(gho_token)',
    };

    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { githubId: '123' },
      update: data,
      create: { githubId: '123', ...data },
    });
  });

  it('descriptografa o token do GitHub', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ githubTokenEncrypted: 'enc(gho_token)' });

    await expect(service.getGithubToken('uuid-1')).resolves.toBe('gho_token');
  });

  it('devolve null quando o usuário não tem token guardado', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ githubTokenEncrypted: null });

    await expect(service.getGithubToken('uuid-1')).resolves.toBeNull();
    expect(encryptionMock.decrypt).not.toHaveBeenCalled();
  });

  it('devolve null quando o usuário não existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.getGithubToken('inexistente')).resolves.toBeNull();
    expect(encryptionMock.decrypt).not.toHaveBeenCalled();
  });

  it('grava null quando o profile não tem email nem avatar', async () => {
    prismaMock.user.upsert.mockResolvedValue({ id: 'uuid-1' });

    await service.upsertFromGithub({
      githubId: '123',
      username: 'john',
      accessToken: 'gho_token',
    });

    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ email: null, avatarUrl: null }) as unknown,
      }),
    );
  });

  it('busca o usuário pelo id', async () => {
    const user = { id: 'uuid-1', username: 'john' };
    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(service.findById('uuid-1')).resolves.toBe(user);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
  });

  it('devolve null quando o id não existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.findById('inexistente')).resolves.toBeNull();
  });

  it('busca o usuário pelo githubId', async () => {
    const user = { id: 'uuid-1', githubId: '123' };
    prismaMock.user.findUnique.mockResolvedValue(user);

    await expect(service.findByGithubId('123')).resolves.toBe(user);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { githubId: '123' } });
  });

  it('devolve null quando o githubId não existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.findByGithubId('inexistente')).resolves.toBeNull();
  });
});
