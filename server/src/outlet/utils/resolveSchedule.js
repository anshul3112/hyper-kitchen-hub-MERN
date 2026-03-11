/**
 * resolveSchedule.js
 *
 * Given an Inventory document (or plain object) and the current date/time,
 * returns the effective price and availability for that item at this moment.
 *
 * Returns:
 *   {
 *     activePrice:   number | null   — null  → fall back to inventory.price or item.defaultAmount
 *     isAvailable:   boolean | null  — null  → fall back to inventory.status (admin toggle)
 *   }
 *
 * Evaluation priority:
 *   1. prioritySlots     (highest — overrides everything when active)
 *   2. priceSlots        (day-of-week + time window → activePrice)
 *   3. availabilitySlots (day-of-week + time window → isAvailable)
 *
 * Availability semantics:
 *   - A matching slot (day in slot.days AND time within window) → isAvailable = true
 *   - Today's day appears in at least one slot but no slot's time window matches → isAvailable = false
 *   - Today's day appears in NO slot at all → isAvailable = null (falls back to inventory.status)
 *
 * Times are stored as minutes-of-day (0 – 1439).
 * endTime must always be > startTime (no midnight crossing).
 */

/**
 * Returns true if `current` falls within [startTime, endTime].
 * No midnight crossing — endTime is always > startTime.
 *
 * @param {number} start  – minutes 0-1440
 * @param {number} end    – minutes 0-1440
 * @param {number} cur    – minutes 0-1440
 */
function isInTimeRange(start, end, cur) {
  return cur >= start && cur <= end;
}

/**
 * Returns true if `now` falls on or between startDate and endDate (day granularity).
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {Date} now
 */
function isDateInRange(startDate, endDate, now) {
  const start = new Date(startDate);
  const end   = new Date(endDate);

  // Compare at day boundaries in UTC so time-of-day doesn't bleed across dates
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay   = Date.UTC(end.getUTCFullYear(),   end.getUTCMonth(),   end.getUTCDate());
  const nowDay   = Date.UTC(now.getUTCFullYear(),   now.getUTCMonth(),   now.getUTCDate());

  return nowDay >= startDay && nowDay <= endDay;
}

/**
 * Resolves the active price and availability for a given inventory record.
 *
 * @param {object} inventory  – Mongoose lean doc or plain object from inventoryModel
 * @param {Date}   [now]      – defaults to new Date() (injectable for tests)
 * @returns {{ activePrice: number|null, isAvailable: boolean|null }}
 */
export function resolveSchedule(inventory, now = new Date()) {
  if (!inventory) return { activePrice: null, isAvailable: null };

  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek   = now.getDay(); // 0 (Sun) – 6 (Sat)

  const prioritySlots     = inventory.prioritySlots     ?? [];
  const priceSlots        = inventory.priceSlots        ?? [];
  const availabilitySlots = inventory.availabilitySlots ?? [];

  // ── 1. Priority slots ─────────────────────────────────────────────────────
  for (const slot of prioritySlots) {
    if (!isDateInRange(slot.startDate, slot.endDate, now)) continue;
    if (!isInTimeRange(slot.startTime, slot.endTime, minuteOfDay)) continue;

    // Priority slot is active → it dictates both price AND forces availability=true
    return { activePrice: slot.price, isAvailable: true };
  }

  // ── 2. Price resolution ───────────────────────────────────────────────────
  let activePrice = null;

  for (const slot of priceSlots) {
    const days = slot.days ?? [];
    if (!days.includes(dayOfWeek)) continue;
    if (!isInTimeRange(slot.startTime, slot.endTime, minuteOfDay)) continue;
    activePrice = slot.price;
    break; // first match wins
  }

  // ── 3. Availability resolution ────────────────────────────────────────────
  // Check whether today's day appears in ANY availability slot
  const hasDaySlot = availabilitySlots.some((slot) => (slot.days ?? []).includes(dayOfWeek));

  if (!hasDaySlot) {
    // No slot is configured for today → fall back to inventory.status
    return { activePrice, isAvailable: null };
  }

  // Today is covered — check if current time falls in any matching window
  let isAvailable = false; // day is configured but time hasn't matched yet

  for (const slot of availabilitySlots) {
    const days = slot.days ?? [];
    if (!days.includes(dayOfWeek)) continue;
    if (!isInTimeRange(slot.startTime, slot.endTime, minuteOfDay)) continue;
    isAvailable = true;
    break;
  }

  return { activePrice, isAvailable };
}

