import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  attachDatabasePool: vi.fn(),
  poolConstructor: vi.fn(),
  poolOn: vi.fn(),
  prismaAdapterConstructor: vi.fn(),
  prismaClientConstructor: vi.fn()
}));

vi.mock('pg', () => ({
  Pool: class MockPool {
    on = mocks.poolOn;

    constructor(options: unknown) {
      mocks.poolConstructor(options);
    }
  }
}));

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class MockPrismaPg {
    constructor(pool: unknown) {
      mocks.prismaAdapterConstructor(pool);
    }
  }
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    constructor(options: unknown) {
      mocks.prismaClientConstructor(options);
    }
  }
}));

vi.mock('@vercel/functions/db-connections', () => ({
  attachDatabasePool: mocks.attachDatabasePool
}));

describe('database pool', () => {
  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:password@pooled.db.prisma.io:5432/postgres');
    vi.stubEnv('VERCEL', '1');
    await import('./db');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('fails fast and releases idle connections promptly on Vercel', () => {
    expect(mocks.poolConstructor).toHaveBeenCalledWith({
      connectionString: 'postgres://user:password@pooled.db.prisma.io:5432/postgres',
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
      max: 3
    });
    expect(mocks.attachDatabasePool).toHaveBeenCalledOnce();
  });
});
