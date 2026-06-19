import { Redis } from "@upstash/redis";

export type UserState = "WAITING_FOR_NAME" | "NORMAL_CHAT";

export interface UserData {
  state: UserState;
  name?: string;
}

const TTL_SECONDS = 60 * 60 * 24 * 90; // 90 วัน
const KEY = (userId: string) => `efl:user:${userId}`;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function getUserData(userId: string): Promise<UserData | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<UserData>(KEY(userId));
}

export async function setWaitingForName(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(KEY(userId), { state: "WAITING_FOR_NAME" } satisfies UserData, {
    ex: TTL_SECONDS,
  });
}

export async function saveNameAndActivate(userId: string, name: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(
    KEY(userId),
    { state: "NORMAL_CHAT", name } satisfies UserData,
    { ex: TTL_SECONDS }
  );
}
