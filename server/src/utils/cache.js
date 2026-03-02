import getRedisClient from "./redis.js";

// ─── Generic helpers ─────────────────────────────────────────────────────────

export async function getJSON(key) {
  try {
    const raw = await getRedisClient().get(key);
    console.log(`[Cache] getJSON key="${key}" hit=${raw !== null}`);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("[Cache] getJSON error:", err.message);
    return null;
  }
}

export async function setJSON(key, value, ttlSeconds = 60) {
  try {
    await getRedisClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("[Cache] setJSON error:", err.message);
  }
}

export async function del(...keys) {
  try {
    if (keys.length > 0) await getRedisClient().del(...keys);
  } catch (err) {
    console.error("[Cache] del error:", err.message);
  } 
}

// ─── Menu cache ──────────────────────────────────────────────────────────────

const MENU_TTL = 5 * 60; // 5 minutes — well within the 1-hr presigned URL TTL

const menuKey = (tenantId) => `menu:${tenantId}`;

export async function getMenuCache(tenantId) {
  return getJSON(menuKey(tenantId));
}

export async function setMenuCache(tenantId, data) {
  return setJSON(menuKey(tenantId), data, MENU_TTL);
}

export async function invalidateMenuCache(tenantId) {
  return del(menuKey(tenantId));
}
