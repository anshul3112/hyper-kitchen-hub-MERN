import cron from "node-cron";
import { Orders } from "../outlet/orders/models/orderModel.js";
import {
  OutletTimeSlotFrequency,
  createEmptyFrequency,
} from "../outlet/kiosk/models/outletTimeSlotFrequencyModel.js";

const CRON_TIMEZONE = process.env.OUTLET_FREQUENCY_TIMEZONE || "Asia/Kolkata";

function formatYmdInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function getPreviousDayYmd(now = new Date(), timeZone = CRON_TIMEZONE) {
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return formatYmdInTimezone(oneDayAgo, timeZone);
}

function normalizeFrequency(freq) {
  const normalized = createEmptyFrequency();
  if (!freq || typeof freq !== "object") return normalized;

  for (let hour = 0; hour < 24; hour += 1) {
    const key = String(hour);
    const hourObj = freq[key];
    normalized[key] =
      hourObj && typeof hourObj === "object" && !Array.isArray(hourObj)
        ? { ...hourObj }
        : {};
  }

  return normalized;
}

async function runOutletTimeSlotFrequencyJob() {
  const startedAt = new Date();
  const previousDayYmd = getPreviousDayYmd(startedAt, CRON_TIMEZONE);

  console.log(
    `[OutletTimeSlotFrequency Cron] Started at ${startedAt.toISOString()} for date ${previousDayYmd} in timezone ${CRON_TIMEZONE}`,
  );

  try {
    const aggregatedCounts = await Orders.aggregate([
      {
        $match: {
          orderStatus: "Completed",
        },
      },
      {
        $addFields: {
          orderDate: { $ifNull: ["$date", "$createdAt"] },
        },
      },
      {
        $match: {
          orderDate: { $type: "date" },
        },
      },
      {
        $addFields: {
          localOrderDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$orderDate",
              timezone: CRON_TIMEZONE,
            },
          },
        },
      },
      {
        $match: {
          localOrderDate: previousDayYmd,
        },
      },
      { $unwind: "$itemsCart" },
      {
        $project: {
          outletId: "$outlet.outletId",
          tenantId: "$tenant.tenantId",
          hour: {
            $hour: {
              date: "$orderDate",
              timezone: CRON_TIMEZONE,
            },
          },
          itemId: "$itemsCart.itemId",
          qty: { $ifNull: ["$itemsCart.qty", 0] },
        },
      },
      {
        $match: {
          outletId: { $ne: null },
          tenantId: { $ne: null },
          itemId: { $ne: null },
          qty: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            outletId: "$outletId",
            tenantId: "$tenantId",
            hour: "$hour",
            itemId: "$itemId",
          },
          count: { $sum: "$qty" },
        },
      },
    ]);

    const outletBucket = new Map();

    for (const row of aggregatedCounts) {
      const outletId = row?._id?.outletId?.toString();
      const tenantId = row?._id?.tenantId?.toString();
      if (!outletId || !tenantId) continue;

      const hour = Number(row?._id?.hour);
      const itemId = String(row?._id?.itemId || "");
      const count = Number(row?.count) || 0;
      if (hour < 0 || hour > 23 || !itemId || count <= 0) continue;

      const bucketKey = `${outletId}:${tenantId}`;

      if (!outletBucket.has(bucketKey)) {
        outletBucket.set(bucketKey, {
          outletId,
          tenantId,
          timeSlots: Array.from({ length: 24 }, () => ({})),
        });
      }

      const bucket = outletBucket.get(bucketKey);
      const hourMap = bucket.timeSlots[hour];
      hourMap[itemId] = (hourMap[itemId] || 0) + count;
    }

    const entries = Array.from(outletBucket.values());
    const settled = await Promise.allSettled(
      entries.map(async ({ outletId, tenantId, timeSlots }) => {
        try {
          const existing = await OutletTimeSlotFrequency.findOne({
            outletId,
            tenantId,
          })
            .select("frequency")
            .lean();

          const nextFrequency = normalizeFrequency(existing?.frequency);

          for (let hour = 0; hour < 24; hour += 1) {
            const hourKey = String(hour);
            const increments = timeSlots[hour];
            for (const [itemId, count] of Object.entries(increments)) {
              nextFrequency[hourKey][itemId] =
                (Number(nextFrequency[hourKey][itemId]) || 0) + (Number(count) || 0);
            }
          }

          await OutletTimeSlotFrequency.updateOne(
            { outletId, tenantId },
            {
              $set: {
                frequency: nextFrequency,
                updatedAt: new Date(),
              },
            },
            { upsert: true },
          );

          return { outletId, tenantId, success: true };
        } catch (err) {
          console.error(
            `[OutletTimeSlotFrequency Cron] Failed outlet=${outletId} tenant=${tenantId}:`,
            err?.message || err,
          );
          return { outletId, tenantId, success: false };
        }
      }),
    );

    let successCount = 0;
    let failureCount = 0;
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value.success) successCount += 1;
      else failureCount += 1;
    }

    console.log(
      `[OutletTimeSlotFrequency Cron] Completed. AggregateRows=${aggregatedCounts.length}, outletsUpdated=${successCount}, outletsFailed=${failureCount}`,
    );
  } catch (err) {
    console.error("[OutletTimeSlotFrequency Cron] Fatal error:", err?.message || err);
  }
}

export function startOutletTimeSlotFrequencyCron() {
  const expression = "0 2 * * *";
  cron.schedule(expression, async () => {
    await runOutletTimeSlotFrequencyJob();
  });

  console.log(
    `[OutletTimeSlotFrequency Cron] Scheduled with expression "${expression}" (runs daily at 2 AM server time)`,
  );
}

export { runOutletTimeSlotFrequencyJob };
