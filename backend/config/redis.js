import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// General-purpose Redis client (used by the app for non-BullMQ work).
const redis = new Redis(REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected");
});
redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

// BullMQ requires maxRetriesPerRequest: null on the ioredis connection.
// A separate instance is used so the app's own Redis client is unaffected.
export const bullmqRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

bullmqRedis.on("error", (error) => {
  console.error("BullMQ Redis connection error:", error.message);
});

export default redis;
