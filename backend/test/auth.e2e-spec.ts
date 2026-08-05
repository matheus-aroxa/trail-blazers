import { INestApplication } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, MetadataScanner } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { IS_PUBLIC_KEY } from './../src/auth/decorators/public.decorator';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { PrismaService } from './../src/prisma/prisma.service';

const CONTROLLERS_PUBLICOS = ['AuthController'];

const usuario = {
  id: '11111111-1111-4111-8111-111111111111',
  githubId: '123',
  username: 'john',
  email: 'john@example.com',
  avatarUrl: 'https://avatar',
  githubTokenEncrypted: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Autenticação e autorização (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let moduleFixture: TestingModule;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(usuario);
  });

  afterAll(async () => {
    await app.close();
  });

  const tokenValido = (payload: Record<string, unknown> = {}) =>
    jwtService.sign({ sub: usuario.id, username: usuario.username, ...payload });

  describe('UC-05 — rotas protegidas por padrão', () => {
    it('GET / sem token devolve 401', () => {
      return request(app.getHttpServer()).get('/').expect(401);
    });

    it('GET / com token válido devolve 200', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${tokenValido()}`)
        .expect(200)
        .expect('Hello World!');
    });

    it('rota inexistente devolve 404 mesmo autenticado', () => {
      return request(app.getHttpServer())
        .get('/rota-que-nao-existe')
        .set('Authorization', `Bearer ${tokenValido()}`)
        .expect(404);
    });

    it('GET /auth/github é público e redireciona para o GitHub', async () => {
      const res = await request(app.getHttpServer()).get('/auth/github').expect(302);

      expect(res.headers.location).toContain('github.com/login/oauth/authorize');
    });
  });

  describe('UC-04 — validação do token', () => {
    it('rejeita requisição sem header Authorization', () => {
      return request(app.getHttpServer()).get('/').expect(401);
    });

    it.each([
      ['header sem o esquema Bearer', 'abc123'],
      ['esquema errado', 'Basic abc123'],
      ['token malformado', 'Bearer nao-e-um-jwt'],
      ['token vazio', 'Bearer '],
    ])('rejeita %s', (_descricao, header) => {
      return request(app.getHttpServer()).get('/').set('Authorization', header).expect(401);
    });

    it('rejeita token expirado', () => {
      const expirado = jwtService.sign({ sub: usuario.id }, { expiresIn: '-1s' });

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${expirado}`)
        .expect(401);
    });

    it('rejeita token assinado com outro segredo', () => {
      const forjado = new JwtService({ secret: 'outro-segredo-com-mais-de-32-caracteres' }).sign({
        sub: usuario.id,
      });

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${forjado}`)
        .expect(401);
    });

    it('rejeita token cujo `sub` não existe mais no banco', () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${tokenValido()}`)
        .expect(401);
    });

    it('busca o usuário pelo `sub` do token', async () => {
      await request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${tokenValido()}`)
        .expect(200);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: usuario.id } });
    });
  });

  describe('CT-05.8 — regressão estrutural', () => {
    it('nenhum controller fora da allowlist está marcado como público', () => {
      const discovery = moduleFixture.get(DiscoveryService);
      const scanner = new MetadataScanner();

      const publicos: string[] = [];

      for (const wrapper of discovery.getControllers()) {
        const instance = wrapper.instance as Record<string, unknown> | undefined;
        const metatype = wrapper.metatype;
        if (!instance || !metatype) continue;

        const nome = metatype.name;

        if (Reflect.getMetadata(IS_PUBLIC_KEY, metatype) === true) {
          publicos.push(nome);
          continue;
        }

        const prototype = Object.getPrototypeOf(instance) as object;

        for (const metodo of scanner.getAllMethodNames(prototype)) {
          if (Reflect.getMetadata(IS_PUBLIC_KEY, instance[metodo] as object) === true) {
            publicos.push(`${nome}.${metodo}`);
          }
        }
      }

      expect(publicos).toEqual(CONTROLLERS_PUBLICOS);
    });

    it('o JwtAuthGuard está registrado como guard global', () => {
      const registrado = moduleFixture
        .get(DiscoveryService)
        .getProviders()
        .some((wrapper) => wrapper.instance instanceof JwtAuthGuard);

      expect(registrado).toBe(true);
    });
  });
});
