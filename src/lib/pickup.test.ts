import { describe, expect, test } from "bun:test";
import { buildPickup } from "./pickup";

describe("buildPickup", () => {
  test("uses explicit pickup location when provided", () => {
    expect(buildPickup("School gate", "1 High Street", "SO52 9EW")).toBe("School gate");
  });

  test("appends postcode when not already in address", () => {
    expect(buildPickup(null, "1 High Street", "SO52 9EW")).toBe("1 High Street, SO52 9EW");
  });

  test("does not duplicate postcode when it is already in address", () => {
    expect(buildPickup(null, "1 High Street, SO52 9EW", "SO52 9EW")).toBe("1 High Street, SO52 9EW");
  });

  test("handles postcode already in address without space", () => {
    expect(buildPickup(null, "1 High Street SO529EW", "SO52 9EW")).toBe("1 High Street SO529EW");
  });

  test("handles address with extra whitespace and mixed casing", () => {
    expect(buildPickup(null, "  1 High Street   SO52 9EW  ", "so52 9ew")).toBe("1 High Street SO52 9EW");
  });

  test("returns 'No pickup' when address and postcode are missing", () => {
    expect(buildPickup(null, "", "")).toBe("No pickup");
    expect(buildPickup(null, null, null)).toBe("No pickup");
  });

  test("returns address only when postcode is missing", () => {
    expect(buildPickup(null, "1 High Street", "")).toBe("1 High Street");
  });

  test("returns postcode only when address is missing", () => {
    expect(buildPickup(null, "", "SO52 9EW")).toBe("SO52 9EW");
  });

  test("matches postcode despite casing differences", () => {
    expect(buildPickup(null, "1 HIGH STREET SO52 9EW", "so52 9ew")).toBe("1 HIGH STREET SO52 9EW");
  });
});
