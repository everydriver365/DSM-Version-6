import { describe, expect, test } from "bun:test";
import { evaluateConflicts, isDoubleBookingError } from "./bookingConflicts";

const base = {
  dateStr: "2026-09-08", // Tuesday
  startMins: 13 * 60,
  endMins: 14 * 60,
  dayLessons: [],
  calendarBlocks: [],
  recurringBlocks: [],
  dayTimeOff: [],
  dayStart: "09:00",
  dayEnd: "18:00",
  isWorkingDay: true,
  bufferAfterMinutes: 30,
} as const;

describe("evaluateConflicts", () => {
  test("free slot has no clashes", () => {
    const r = evaluateConflicts({ ...base });
    expect(r.blocking).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  test("overlapping lesson blocks the save", () => {
    const r = evaluateConflicts({
      ...base,
      dayLessons: [
        { lesson_time: "13:30", duration_minutes: 60, status: "confirmed", pupilName: "Sarah Jones" },
      ],
    });
    expect(r.blocking).toHaveLength(1);
    expect(r.blocking[0].label).toContain("Sarah Jones");
  });

  test("cancelled lesson does not block", () => {
    const r = evaluateConflicts({
      ...base,
      dayLessons: [{ lesson_time: "13:00", duration_minutes: 60, status: "cancelled" }],
    });
    expect(r.blocking).toHaveLength(0);
  });

  test("blocking Google event clashes", () => {
    const r = evaluateConflicts({
      ...base,
      calendarBlocks: [
        {
          start_datetime: new Date("2026-09-08T13:00:00").toISOString(),
          end_datetime: new Date("2026-09-08T14:00:00").toISOString(),
          title: "Dentist",
          blocks_availability: true,
        },
      ],
    });
    expect(r.blocking[0]?.label).toContain("Dentist");
  });

  test("non-blocking calendar event is allowed", () => {
    const r = evaluateConflicts({
      ...base,
      calendarBlocks: [
        {
          start_datetime: new Date("2026-09-08T13:00:00").toISOString(),
          end_datetime: new Date("2026-09-08T14:00:00").toISOString(),
          title: "FYI",
          blocks_availability: false,
        },
      ],
    });
    expect(r.blocking).toHaveLength(0);
  });

  test("time off blocks the save", () => {
    const r = evaluateConflicts({
      ...base,
      dayTimeOff: [{ all_day: true }],
    });
    expect(r.blocking[0].kind).toBe("time_off");
  });

  test("recurring block blocks the save", () => {
    const r = evaluateConflicts({
      ...base,
      recurringBlocks: [
        { day_of_week: "Tuesday", start_time: "12:30", end_time: "13:30", title: "Lunch" },
      ],
    });
    expect(r.blocking[0].label).toContain("Lunch");
  });

  test("tight travel time is a warning, not a block", () => {
    const r = evaluateConflicts({
      ...base,
      dayLessons: [
        { lesson_time: "14:00", duration_minutes: 60, status: "confirmed", pupilName: "Tom" },
      ],
    });
    expect(r.blocking).toHaveLength(0);
    expect(r.warnings[0].kind).toBe("buffer");
  });

  test("outside working hours warns", () => {
    const r = evaluateConflicts({ ...base, startMins: 19 * 60, endMins: 20 * 60 });
    expect(r.warnings.some((w) => w.kind === "hours")).toBe(true);
    expect(r.blocking).toHaveLength(0);
  });

  test("recognises the database guard error", () => {
    expect(isDoubleBookingError({ code: "23P01" })).toBe(true);
    expect(isDoubleBookingError({ code: "23505" })).toBe(false);
  });
});
