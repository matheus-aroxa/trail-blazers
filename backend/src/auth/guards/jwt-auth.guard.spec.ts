import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const handler = () => undefined;
  class DummyController {}

  const context = {
    getHandler: () => handler,
    getClass: () => DummyController,
  } as unknown as ExecutionContext;

  const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype as JwtAuthGuard, 'canActivate');

  beforeEach(() => {
    jest.clearAllMocks();
    superCanActivate.mockReturnValue(true);

    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  afterAll(() => {
    superCanActivate.mockRestore();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('libera a rota marcada como pública sem acionar o passport', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('delega ao passport quando a rota não é pública', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);
  });

  it('delega ao passport quando o metadata é explicitamente false', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    void guard.canActivate(context);

    expect(superCanActivate).toHaveBeenCalledWith(context);
  });

  it('propaga a negativa do passport', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    superCanActivate.mockReturnValue(false);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('consulta o metadata no handler e na classe, nessa ordem', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    void guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, DummyController]);
  });
});
