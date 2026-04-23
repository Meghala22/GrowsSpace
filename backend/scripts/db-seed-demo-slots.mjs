import { Client } from "pg";
import { getSslConfig, requireEnv } from "./env.mjs";

const client = new Client({
  connectionString: requireEnv("DATABASE_URL"),
  ssl: getSslConfig(),
});

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

const serviceSchedules = [
  {
    serviceName: "Beginner Gardening Workshop",
    slotType: "WORKSHOP",
    dailySlots: [
      { startTime: "09:00", durationMinutes: 90, maxCapacity: 12 },
      { startTime: "13:00", durationMinutes: 90, maxCapacity: 12 },
      { startTime: "16:30", durationMinutes: 90, maxCapacity: 12 },
    ],
  },
  {
    serviceName: "Indoor Plant Care Workshop",
    slotType: "WORKSHOP",
    dailySlots: [
      { startTime: "10:00", durationMinutes: 90, maxCapacity: 10 },
      { startTime: "14:00", durationMinutes: 90, maxCapacity: 10 },
      { startTime: "18:00", durationMinutes: 90, maxCapacity: 10 },
    ],
  },
  {
    serviceName: "Composting Basics",
    slotType: "WORKSHOP",
    dailySlots: [
      { startTime: "08:30", durationMinutes: 60, maxCapacity: 14 },
      { startTime: "12:00", durationMinutes: 60, maxCapacity: 14 },
      { startTime: "15:30", durationMinutes: 60, maxCapacity: 14 },
    ],
  },
  {
    serviceName: "Hydroponics Intro",
    slotType: "WORKSHOP",
    dailySlots: [
      { startTime: "09:30", durationMinutes: 75, maxCapacity: 8 },
      { startTime: "13:30", durationMinutes: 75, maxCapacity: 8 },
      { startTime: "17:00", durationMinutes: 75, maxCapacity: 8 },
    ],
  },
  {
    serviceName: "Potting Station",
    slotType: "STATION",
    dailySlots: [
      { startTime: "09:00", durationMinutes: 45, maxCapacity: 4 },
      { startTime: "11:00", durationMinutes: 45, maxCapacity: 4 },
      { startTime: "14:00", durationMinutes: 45, maxCapacity: 4 },
      { startTime: "16:00", durationMinutes: 45, maxCapacity: 4 },
    ],
  },
  {
    serviceName: "Repotting Station",
    slotType: "STATION",
    dailySlots: [
      { startTime: "09:30", durationMinutes: 45, maxCapacity: 3 },
      { startTime: "12:30", durationMinutes: 45, maxCapacity: 3 },
      { startTime: "15:30", durationMinutes: 45, maxCapacity: 3 },
      { startTime: "18:00", durationMinutes: 45, maxCapacity: 3 },
    ],
  },
  {
    serviceName: "Soil Mixing Station",
    slotType: "STATION",
    dailySlots: [
      { startTime: "08:00", durationMinutes: 45, maxCapacity: 4 },
      { startTime: "10:30", durationMinutes: 45, maxCapacity: 4 },
      { startTime: "13:30", durationMinutes: 45, maxCapacity: 4 },
      { startTime: "17:00", durationMinutes: 45, maxCapacity: 4 },
    ],
  },
  {
    serviceName: "Plant Treatment Station",
    slotType: "STATION",
    dailySlots: [
      { startTime: "09:15", durationMinutes: 45, maxCapacity: 2 },
      { startTime: "12:15", durationMinutes: 45, maxCapacity: 2 },
      { startTime: "15:15", durationMinutes: 45, maxCapacity: 2 },
      { startTime: "17:45", durationMinutes: 45, maxCapacity: 2 },
    ],
  },
];

function buildValuesPlaceholders(slotCount, offset) {
  return Array.from({ length: slotCount }, (_, index) => {
    const baseIndex = offset + index * 3;
    return `($${baseIndex}, $${baseIndex + 1}, $${baseIndex + 2})`;
  }).join(",\n            ");
}

try {
  await client.connect();

  const serviceResult = await client.query(
    "select id, name from services where active = true",
  );
  const serviceMap = new Map(serviceResult.rows.map((row) => [row.name, row.id]));

  const startDate = addDays(new Date(), 1);
  const endDate = addYears(startDate, 5);

  let insertedCount = 0;

  for (const schedule of serviceSchedules) {
    const serviceId = serviceMap.get(schedule.serviceName);
    if (!serviceId) {
      continue;
    }

    const values = [serviceId, schedule.slotType, startDate, endDate];
    for (const slot of schedule.dailySlots) {
      values.push(slot.startTime, slot.durationMinutes, slot.maxCapacity);
    }

    const placeholders = buildValuesPlaceholders(schedule.dailySlots.length, 5);
    const result = await client.query(
      `
        insert into slots (
          service_id,
          slot_type,
          slot_date,
          start_time,
          end_time,
          duration_minutes,
          max_capacity
        )
        select
          $1,
          $2::slot_type,
          dates.slot_date,
          template.start_time::time,
          (template.start_time::time + make_interval(mins => template.duration_minutes::int))::time,
          template.duration_minutes::int,
          template.max_capacity::int
        from generate_series($3::date, $4::date, interval '1 day') as dates(slot_date)
        cross join (
          values
            ${placeholders}
        ) as template(start_time, duration_minutes, max_capacity)
        on conflict (service_id, slot_date, start_time, slot_type) do nothing
      `,
      values,
    );

    insertedCount += result.rowCount ?? 0;
  }

  console.log(
    `Demo slot seeding completed. Inserted ${insertedCount} daily slots through ${endDate.toISOString().slice(0, 10)}.`,
  );
} finally {
  await client.end().catch(() => undefined);
}
