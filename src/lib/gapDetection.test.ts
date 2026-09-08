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

  test("reserves travel time before a lesson and drops the gap when too short", () => {
    expect(
      computeDayGaps({
        ...base,
        dayLessons: [{ lesson_time: "10:00", duration_minutes: 60, bufferAfterMinutes: 15 }],
      }),
    ).toEqual([{ startMins: 675, endMins: 1080, gapMins: 405 }]);
  });

  test("shortens a gap by the travel buffer of the following lesson", () => {
    expect(
      computeDayGaps({
        ...base,
        dayLessons: [
          { lesson_time: "09:00", duration_minutes: 120, bufferAfterMinutes: 15 },
          { lesson_time: "13:00", duration_minutes: 60, bufferAfterMinutes: 15 },
        ],
        minGapMinutes: 30,
      }),
    ).toEqual([
      { startMins: 675, endMins: 765, gapMins: 90 },
      { startMins: 855, endMins: 1080, gapMins: 225 },
    ]);
  });

  test("leaves the end-of-day gap at full length", () => {
    expect(
      computeDayGaps({
        ...base,
        dayLessons: [{ lesson_time: "09:00", duration_minutes: 60, bufferAfterMinutes: 15 }],
      }),
    ).toEqual([{ startMins: 615, endMins: 1080, gapMins: 465 }]);
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

  test("clamps an imported calendar event that begins before working hours", () => {
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
    ).toEqual([{ startMins: 675, endMins: 960, gapMins: 285 }]);
  });

  test("treats an all-day imported calendar event as a note, not busy time", () => {
    expect(
      computeDayGaps({
        ...base,
        calendarBlocks: [{
          start_datetime: "2026-09-08T00:00:00",
          end_datetime: "2026-09-09T00:00:00",
          is_all_day: true,
        }],
      }),
    ).toEqual([{ startMins: 540, endMins: 1080, gapMins: 540 }]);
  });


  test("reserves travel time on both sides of imported calendar events", () => {
    expect(
      computeDayGaps({
        ...base,
        dayStart: "10:30",
        dayEnd: "16:00",
        instructorBufferAfter: 30,
        calendarBlocks: [
          {
            start_datetime: "2026-09-08T09:00:00",
            end_datetime: "2026-09-08T12:00:00",
          },
          {
            start_datetime: "2026-09-08T13:00:00",
            end_datetime: "2026-09-08T16:00:00",
          },
        ],
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

  test("applies partial time off and recurring blocks with travel time before them", () => {
    expect(
      computeDayGaps({
        ...base,
        recurringBlocks: [{ day_of_week: "Tuesday", start_time: "11:00", end_time: "12:00" }],
        dayTimeOff: [{ start_time: "14:00", end_time: "15:00", all_day: false }],
      }),
    ).toEqual([
      { startMins: 540, endMins: 645, gapMins: 105 },
      { startMins: 720, endMins: 825, gapMins: 105 },
      { startMins: 900, endMins: 1080, gapMins: 180 },
    ]);
  });

  test("moves today's first gap to 30 minutes from now and rounds to 15 minutes", () => {
    expect(computeDayGaps({ ...base, isToday: true, nowMinutes: 600 })).toEqual([
      { startMins: 630, endMins: 1080, gapMins: 450 },
    ]);
  });

  test("blocks a slot before a Google Calendar event with travel buffer", () => {
    expect(
      computeDayGaps({
        ...base,
        calendarBlocks: [{
          start_datetime: "2026-09-08T15:00:00",
          end_datetime: "2026-09-08T16:00:00",
        }],
      }),
    ).toEqual([
      { startMins: 540, endMins: 885, gapMins: 345 },
      { startMins: 975, endMins: 1080, gapMins: 105 },
    ]);
  });
});