import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let connect: jest.SpyInstance;
  let disconnect: jest.SpyInstance;

  beforeEach(() => {
    service = new PrismaService();
    connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('conecta no onModuleInit', async () => {
    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('desconecta no onModuleDestroy', async () => {
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
