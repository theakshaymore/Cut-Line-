import Redis from "ioredis";

let redis;

export const getRedis = () => redis;

export const initRedis = async () => {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });

  redis.on("error", (err) => {
    console.error("Redis error:", err.message);
  });

  try {
    await redis.connect();
    console.log("Redis connected");
  } catch (err) {
    console.error("Redis connect failed, continuing without cache:", err.message);
    redis = null;
  }
};

export const setCustomerSocket = async (customerId, socketId) => {
  if (!redis) return;
  await redis.set(`socket:${customerId}`, socketId);
};

export const removeCustomerSocket = async (customerId) => {
  if (!redis) return;
  await redis.del(`socket:${customerId}`);
};

export const cacheQueue = async (salonId, queueEntries) => {
  if (!redis) return;
  const key = `salon:${salonId}:queue`;
  await redis.del(key);
  if (!queueEntries.length) return;
  const args = queueEntries.flatMap((entry) => [entry.position, JSON.stringify(entry)]);
  await redis.zadd(key, ...args);
};

export const cacheChairs = async (salonId, chairs) => {
  if (!redis) return;
  const key = `salon:${salonId}:chairs`;
  await redis.del(key);
  if (!chairs.length) return;
  const fields = chairs.flatMap((chair) => [chair.id, JSON.stringify(chair)]);
  await redis.hset(key, ...fields);
};

export const checkJoinRateLimit = async (customerId) => {
  if (!redis) return false;
  const key = `ratelimit:join:${customerId}`;
  const exists = await redis.get(key);
  if (exists) return true;
  await redis.set(key, "1", "EX", 10);
  return false;
};
