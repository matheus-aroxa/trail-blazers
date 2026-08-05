import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../types/jwt-payload';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const configMock = { getOrThrow: jest.fn().mockReturnValue('segredo-com-mais-de-32-caracteres') };
  const usersMock = { findById: jest.fn() };

  const payload: JwtPayload = {
    sub: 'uuid-interno',
    username: 'john',
    email: 'john@example.com',
    avatarUrl: 'https://avatar',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configMock.getOrThrow.mockReturnValue('segredo-com-mais-de-32-caracteres');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: configMock },
        { provide: UsersService, useValue: usersMock },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('configura a strategy com o JWT_SECRET', () => {
    expect(configMock.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('devolve o usuário autenticado a partir do `sub`', async () => {
    usersMock.findById.mockResolvedValue({
      id: 'uuid-interno',
      githubId: '123',
      username: 'john',
      email: 'john@example.com',
      avatarUrl: 'https://avatar',
      githubTokenEncrypted: 'enc(gho_token)',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'uuid-interno',
      githubId: '123',
      username: 'john',
      email: 'john@example.com',
      avatarUrl: 'https://avatar',
    });

    expect(usersMock.findById).toHaveBeenCalledWith('uuid-interno');
  });

  it('não expõe o token do GitHub no usuário autenticado', async () => {
    usersMock.findById.mockResolvedValue({
      id: 'uuid-interno',
      githubId: '123',
      username: 'john',
      email: null,
      avatarUrl: null,
      githubTokenEncrypted: 'enc(gho_token)',
    });

    const user = await strategy.validate(payload);

    expect(user).not.toHaveProperty('githubTokenEncrypted');
  });

  it('prioriza os dados do banco sobre os do payload', async () => {
    usersMock.findById.mockResolvedValue({
      id: 'uuid-interno',
      githubId: '123',
      username: 'novo-username',
      email: null,
      avatarUrl: null,
    });

    const user = await strategy.validate(payload);

    expect(user.username).toBe('novo-username');
    expect(user.email).toBeNull();
  });

  it('lança UnauthorizedException quando o usuário não existe', async () => {
    usersMock.findById.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow('Usuário não encontrado');
  });
});
