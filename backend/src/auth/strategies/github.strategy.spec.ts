import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Profile } from 'passport-github2';
import { GithubUser } from '../types/github-user';
import { GithubStrategy } from './github.strategy';

describe('GithubStrategy', () => {
  let strategy: GithubStrategy;

  const env: Record<string, string> = {
    GITHUB_CLIENT_ID: 'client-id',
    GITHUB_CLIENT_SECRET: 'client-secret',
    GITHUB_CALLBACK_URL: 'http://localhost:3000/auth/github/callback',
  };

  const configMock = { getOrThrow: jest.fn((key: string) => env[key]) };

  const buildProfile = (overrides: Partial<Profile> = {}) =>
    ({
      id: '123',
      username: 'john',
      emails: [{ value: 'john@example.com' }],
      photos: [{ value: 'https://avatar' }],
      ...overrides,
    }) as Profile;

  const runValidate = (profile: Profile) => {
    let result: GithubUser | undefined;
    strategy.validate('gho_token', 'refresh', profile, (_err, user) => {
      result = user;
    });
    return result;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubStrategy, { provide: ConfigService, useValue: configMock }],
    }).compile();

    strategy = module.get<GithubStrategy>(GithubStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('lê as credenciais do OAuth App a partir do ConfigService', () => {
    expect(configMock.getOrThrow).toHaveBeenCalledWith('GITHUB_CLIENT_ID');
    expect(configMock.getOrThrow).toHaveBeenCalledWith('GITHUB_CLIENT_SECRET');
    expect(configMock.getOrThrow).toHaveBeenCalledWith('GITHUB_CALLBACK_URL');
  });

  it('mapeia o profile do GitHub para GithubUser', async () => {
    await expect(runValidate(buildProfile())).resolves.toEqual({
      githubId: '123',
      username: 'john',
      email: 'john@example.com',
      avatarUrl: 'https://avatar',
      accessToken: 'gho_token',
    });
  });

  it('usa apenas o primeiro email e a primeira foto', () => {
    const profile = buildProfile({
      emails: [{ value: 'principal@example.com' }, { value: 'secundario@example.com' }],
      photos: [{ value: 'https://primeira' }, { value: 'https://segunda' }],
    });

    const user = runValidate(profile);

    expect(user?.email).toBe('principal@example.com');
    expect(user?.avatarUrl).toBe('https://primeira');
  });

  it('devolve undefined quando não há email nem foto', () => {
    const user = runValidate(buildProfile({ emails: undefined, photos: undefined }));

    expect(user?.email).toBeUndefined();
    expect(user?.avatarUrl).toBeUndefined();
    expect(user?.githubId).toBe('123');
  });

  it('devolve undefined quando as listas de email e foto vêm vazias', () => {
    const user = runValidate(buildProfile({ emails: [], photos: [] }));

    expect(user?.email).toBeUndefined();
    expect(user?.avatarUrl).toBeUndefined();
  });

  it('usa string vazia quando o profile não tem username', () => {
    const user = runValidate(buildProfile({ username: undefined }));

    expect(user?.username).toBe('');
  });

  it('chama o callback sem erro', () => {
    const done = jest.fn();

    strategy.validate('gho_token', 'refresh', buildProfile(), done);

    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ githubId: '123' }));
  });
});
