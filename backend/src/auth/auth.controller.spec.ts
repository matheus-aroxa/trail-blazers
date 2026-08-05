import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GithubUser } from './types/github-user';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = { loginWithGithub: jest.fn() };
  const configMock = { getOrThrow: jest.fn() };

  const githubUser: GithubUser = {
    githubId: '123',
    username: 'john',
    email: 'john@example.com',
    avatarUrl: 'https://avatar',
    accessToken: 'gho_token',
  };

  const buildResponse = () => {
    const redirect = jest.fn();
    return { res: { redirect } as unknown as Response, redirect };
  };
  const buildRequest = (user?: GithubUser) => ({ user }) as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();
    authServiceMock.loginWithGithub.mockResolvedValue({ accessToken: 'jwt-assinado' });
    configMock.getOrThrow.mockReturnValue('http://localhost:3001');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('githubAuth apenas delega o redirect ao guard', async () => {
    await expect(controller.githubAuth()).resolves.toBeUndefined();
  });

  describe('githubAuthCallback', () => {
    it('redireciona para o front com o token na query', async () => {
      const { res, redirect } = buildResponse();

      await controller.githubAuthCallback(buildRequest(githubUser), res);

      expect(authServiceMock.loginWithGithub).toHaveBeenCalledWith(githubUser);
      expect(redirect).toHaveBeenCalledWith(
        'http://localhost:3001/auth/success?token=jwt-assinado',
      );
    });

    it('monta a URL a partir do FRONTEND_URL configurado', async () => {
      configMock.getOrThrow.mockReturnValue('https://app.trailblazers.dev');
      const { res, redirect } = buildResponse();

      await controller.githubAuthCallback(buildRequest(githubUser), res);

      expect(configMock.getOrThrow).toHaveBeenCalledWith('FRONTEND_URL');
      expect(redirect).toHaveBeenCalledWith(
        'https://app.trailblazers.dev/auth/success?token=jwt-assinado',
      );
    });

    it('lança UnauthorizedException quando o guard não anexou o usuário', async () => {
      const { res, redirect } = buildResponse();

      await expect(controller.githubAuthCallback(buildRequest(), res)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.githubAuthCallback(buildRequest(), res)).rejects.toThrow(
        'Falha na autenticação com o GitHub',
      );

      expect(authServiceMock.loginWithGithub).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
