import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { GithubUser } from './types/github-user';

describe('AuthService', () => {
  let service: AuthService;

  const jwtMock = { signAsync: jest.fn() };
  const usersMock = { upsertFromGithub: jest.fn() };

  const githubUser: GithubUser = {
    githubId: '123',
    username: 'john',
    email: 'john@example.com',
    avatarUrl: 'https://avatar',
    accessToken: 'gho_token',
  };

  const persistedUser = {
    id: 'uuid-interno',
    githubId: '123',
    username: 'john',
    email: 'john@example.com',
    avatarUrl: 'https://avatar',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtMock.signAsync.mockResolvedValue('jwt-assinado');
    usersMock.upsertFromGithub.mockResolvedValue(persistedUser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtMock },
        { provide: UsersService, useValue: usersMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('usa o id interno do usuário como `sub`, e não o githubId', async () => {
    await service.loginWithGithub(githubUser);

    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'uuid-interno' }),
    );

    const [payload] = jwtMock.signAsync.mock.calls[0] as [Record<string, unknown>];
    expect(payload.sub).not.toBe(githubUser.githubId);
  });

  it('persiste o usuário antes de assinar e devolve o token', async () => {
    const result = await service.loginWithGithub(githubUser);

    expect(usersMock.upsertFromGithub).toHaveBeenCalledWith(githubUser);
    expect(result).toEqual({ accessToken: 'jwt-assinado' });
  });

  it('monta o payload com os dados persistidos', async () => {
    await service.loginWithGithub(githubUser);

    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: 'uuid-interno',
      username: 'john',
      email: 'john@example.com',
      avatarUrl: 'https://avatar',
    });
  });

  it('converte email/avatarUrl nulos em undefined no payload', async () => {
    usersMock.upsertFromGithub.mockResolvedValue({
      ...persistedUser,
      email: null,
      avatarUrl: null,
    });

    await service.loginWithGithub(githubUser);

    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: 'uuid-interno',
      username: 'john',
      email: undefined,
      avatarUrl: undefined,
    });
  });

  it('propaga falha da persistência sem emitir token', async () => {
    usersMock.upsertFromGithub.mockRejectedValue(new Error('banco fora do ar'));

    await expect(service.loginWithGithub(githubUser)).rejects.toThrow('banco fora do ar');
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });
});
