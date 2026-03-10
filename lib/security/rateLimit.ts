type RateLimitEntry = {
  timestamps: number[];
};

const WINDOW_MS = 60_000;
const LIMIT_SCRAPER = 20;
const LIMIT_DEFAULT = 100;

const store = new Map<string, RateLimitEntry>();

const cleanupExpired = () => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
};

export const checkRateLimit = (ip: string, endpoint: string): boolean => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const key = `${ip}:${endpoint}`;
  const isScraperEndpoint = endpoint === '/api/scraper';
  const limit = isScraperEndpoint ? LIMIT_SCRAPER : LIMIT_DEFAULT;

  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (entry.timestamps.length >= limit) {
    store.set(key, entry);
    cleanupExpired();
    return false;
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  cleanupExpired();

  return true;
};

