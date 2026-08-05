import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const key = randomBytes(32).toString('hex');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: { getOrThrow: () => key } },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('faz o round-trip do texto', () => {
    const token = 'gho_umTokenDoGitHub';

    expect(service.decrypt(service.encrypt(token))).toBe(token);
  });

  it('gera saídas diferentes para a mesma entrada (IV aleatório)', () => {
    expect(service.encrypt('mesmo-valor')).not.toBe(service.encrypt('mesmo-valor'));
  });

  it('rejeita conteúdo adulterado', () => {
    const [iv, authTag] = service.encrypt('token').split(':');
    const adulterado = [iv, authTag, Buffer.from('outra-coisa').toString('base64')].join(':');

    expect(() => service.decrypt(adulterado)).toThrow();
  });

  it('rejeita formato inválido', () => {
    expect(() => service.decrypt('nao-e-um-payload')).toThrow(
      'Conteúdo criptografado em formato inválido',
    );
  });

  it('rejeita payload com partes faltando', () => {
    expect(() => service.decrypt('aaa:bbb')).toThrow('Conteúdo criptografado em formato inválido');
    expect(() => service.decrypt('')).toThrow('Conteúdo criptografado em formato inválido');
  });

  it('rejeita IV com tamanho diferente de 12 bytes', () => {
    const [, authTag, cipherText] = service.encrypt('token').split(':');
    const ivCurto = randomBytes(8).toString('base64');

    expect(() => service.decrypt([ivCurto, authTag, cipherText].join(':'))).toThrow(
      'Conteúdo criptografado em formato inválido',
    );
  });

  it('rejeita authTag com tamanho diferente de 16 bytes', () => {
    const [iv, , cipherText] = service.encrypt('token').split(':');
    const tagCurta = randomBytes(8).toString('base64');

    expect(() => service.decrypt([iv, tagCurta, cipherText].join(':'))).toThrow(
      'Conteúdo criptografado em formato inválido',
    );
  });

  it('não decifra conteúdo cifrado com outra chave', async () => {
    const outroModule: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => randomBytes(32).toString('hex') },
        },
      ],
    }).compile();

    const outroService = outroModule.get<EncryptionService>(EncryptionService);

    expect(() => outroService.decrypt(service.encrypt('token'))).toThrow();
  });

  it('preserva caracteres não-ASCII no round-trip', () => {
    const texto = 'ação — çãõ 🔐';

    expect(service.decrypt(service.encrypt(texto))).toBe(texto);
  });

  it('cifra string vazia', () => {
    expect(service.decrypt(service.encrypt(''))).toBe('');
  });
});
