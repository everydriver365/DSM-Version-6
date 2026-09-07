import { describe, expect, test } from "bun:test";
import { computeDayGaps } from "./gapDetection";

const base = {
  dayLessons: [],
  calendarBlocks: [],
  recurringBlocks: [],
  dayTimeOff: [],
  dayStart: "09:00",
  dayEnd: "18:00",
  instructorBufferAfter: 15,
  dateStr: "2026-09-08",
  isToday: false,
  minGapMinutes: 60,
};

describe("computeDayGaps", () => {
  test("returns the full working day when nothing is booked", () => {
    expect(computeDayGaps(base)).toEqual([{ startMins: 540, endMins: 1080, gapMins: 540 }]);
  });

  test("does not subtract an upcoming lesson's after-buffer from the morning gap", () => {
    expect(
      computeDayGaps({
        ...base,
        dayLessons: [{ lesson_time: "10:00", duration_minutes: 60, bufferAfterMinutes: 15 }],
      }),
    ).toEqual([
      { startMins: 540, endMins: 600, gapMins: 60 },
      { startMins: 675, endMins: 1080, gapMins: 405 },
    ]);
  });

  test("merges overlapping busy periods without moving the cursor backwards", () => {
    expect(
      computeDayGaps({
        ...base,
        dayLessons: [
          { lesson_time: "10:00", duration_minutes: 180, bufferAfterMinutes: 0 },
          { lesson_time: "11:00", duration_minutes: 60, bufferAfterMinutes: 0 },
        ],
      }),
    ).toEqual([
      { startMins: 540, endMins: 600, gapMins: 60 },
      { startMins: 780, endMins: 1080, gapMins: 300 },
    ]);
  });

  test("clamps an ICS event that begins before working hours", () => {
    expect(
      computeDayGaps({
        ...base,
        dayStart: "10:30",
        dayEnd: "16:00",
        calendarBlocks: [{
          start_datetime: "2026-09-08T08:00:00",
          end_datetime: "2026-09-08T11:00:00",
        }],
      }),
    ).toEqual([{ startMins: 660, endMins: 960, gapMins: 300 }]);
  });

  test("blocks the day for an all-day ICS event", () => {
    expect(
      computeDayGaps({
        ...base,
        calendarBlocks: [{
          start_datetime: "2026-09-08T00:00:00",
          end_datetime: "2026-09-09T00:00:00",
          is_all_day: true,
        }],
      }),
    ).toEqual([]);
  });

  test("ignores calendar events that do not block availability", () => {
    expect(
      computeDayGaps({
        ...base,
        calendarBlocks: [{
          start_datetime: "2026-09-08T12:00:00",
          end_datetime: "2026-09-08T13:00:00",
          blocks_availability: false,
        }],
      }),
    ).toEqual([{ startMins: 540, endMins: 1080, gapMins: 540 }]);
  });

  test("applies partial time off and recurring blocks without travel buffers", () => {
    expect(
      computeDayGaps({
        ...base,
        recurringBlocks: [{ day_of_week: "Tuesday", start_time: "11:00", end_time: "12:00" }],
        dayTimeOff: [{ start_time: "14:00", end_time: "15:00", all_day: false }],
      }),
    ).toEqual([
      { startMins: 540, endMins: 660, gapMins: 120 },
      { startMins: 720, endMins: 840, gapMins: 120 },
      { startMins: 900, endMins: 1080, gapMins: 180 },
    ]);
  });

  test("moves today's first gap to 30 minutes from now and rounds to 15 minutes", () => {
    expect(computeDayGaps({ ...base, isToday: true, nowMinutes: 600 })).toEqual([
      { startMins: 630, endMins: 1080, gapMins: 450 },
    ]);
  });
});