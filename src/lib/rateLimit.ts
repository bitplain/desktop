import { getPrisma } from "./db";

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

type MemoryBucket = {
  hits: number;
  resetAt: Date;
};

const memoryBuckets = new Map<string, MemoryBucket>();

function consumeMemoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = new Date();
  const windowReset = new Date(now.getTime() + options.windowMs);
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { hits: 1, resetAt: windowReset });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt: windowReset,
    };
  }

  if (existing.hits + 1 > options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  const next = { hits: existing.hits + 1, resetAt: existing.resetAt };
  memoryBuckets.set(key, next);
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - next.hits),
    resetAt: next.resetAt,
  };
}

export async function consumeRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = new Date();
  let prisma: ReturnType<typeof getPrisma>;
  try {
    prisma = getPrisma();
  } catch {
    return consumeMemoryRateLimit(key, options);
  }
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
  const windowReset = new Date(now.getTime() + options.windowMs);

  if (!existing || existing.resetAt <= now) {
    const created = await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, hits: 1, resetAt: windowReset },
      update: { hits: 1, resetAt: windowReset },
    });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - created.hits),
      resetAt: created.resetAt,
    };
  }

  if (existing.hits + 1 > options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  const updated = await prisma.rateLimitBucket.update({
    where: { key },
    data: { hits: existing.hits + 1 },
  });

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - updated.hits),
    resetAt: updated.resetAt,
  };
}
