import { describe, it, expect } from "vitest";
import {
  londonWallToUtcMs,
  utcMsToLondonWall,
  lessonWallRange,
  allDayRangeToIso,
} from "./londonTime";

describe("londonTime", () => {
  it("treats a winter (GMT) wall time as UTC", () => {
    expect(new Date(londonWallToUtcMs("2026-01-15", "10:00")).toISOString())
      .toBe("2026-01-15T10:00:00.000Z");
  });

  it("treats a summer (BST) wall time as UTC+1", () => {
    expect(new Date(londonWallToUtcMs("2026-07-01", "10:00")).toISOString())
      .toBe("2026-07-01T09:00:00.000Z");
  });

  it("round-trips both ways", () => {
    for (const [d, t] of [["2026-01-15", "10:00"], ["2026-07-01", "10:00"]]) {
      expect(utcMsToLondonWall(londonWallToUtcMs(d, t))).toBe(`${d}T${t}:00`);
    }
  });

  it("keeps a lesson at its booked local time in summer", () => {
    const r = lessonWallRange("2026-07-01", "10:00:00", 60);
    expect(r.start).toBe("2026-07-01T10:00:00");
    expect(r.end).toBe("2026-07-01T11:00:00");
    expect(r.timeZone).toBe("Europe/London");
  });

  it("keeps a lesson at its booked local time in winter", () => {
    const r = lessonWallRange("2026-01-15", "14:30:00", 90);
    expect(r.start).toBe("2026-01-15T14:30:00");
    expect(r.end).toBe("2026-01-15T16:00:00");
  });

  it("handles the March clocks-forward morning", () => {
    // 2026 BST starts 29 March at 01:00 GMT. A 00:30 lesson of 60 mins
    // ends at 02:30 local because 01:00-02:00 does not exist.
    const r = lessonWallRange("2026-03-29", "00:30:00", 60);
    expect(r.start).toBe("2026-03-29T00:30:00");
    expect(r.end).toBe("2026-03-29T02:30:00");
  });

  it("handles the October clocks-back morning", () => {
    // 2026 BST ends 25 October at 02:00 BST -> 01:00 GMT.
    const r = lessonWallRange("2026-10-25", "00:30:00", 60);
    expect(r.start).toBe("2026-10-25T00:30:00");
    expect(r.end).toBe("2026-10-25T01:30:00");
  });

  it("maps an all-day event to London midnight, exclusive end", () => {
    const r = allDayRangeToIso("2026-07-01", "2026-07-02");
    expect(r.startIso).toBe("2026-06-30T23:00:00.000Z");
    expect(r.endIso).toBe("2026-07-01T23:00:00.000Z");
  });
});
