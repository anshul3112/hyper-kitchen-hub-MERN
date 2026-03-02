import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redisClient;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // null = never throw MaxRetriesPerRequestError
      enableReadyCheck: false,    // don't block commands until READY
      lazyConnect: true,          // don't connect until first command
      retryStrategy(attempt) {
        if (attempt >= 3) return null; // give up after 3 attempts
        return Math.min(200 * 2 ** attempt, 2000);
      },
    });

    redisClient.on("error", (err) => {
      console.error("[Redis] Error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected");
    });
  }
  return redisClient;
}

export async function connectToRedis() {
  try {
    await getRedisClient().ping();
  } catch (err) {
    console.warn("[Redis] Could not connect — caching will be skipped:", err.message);
  }
}

export default getRedisClient;
