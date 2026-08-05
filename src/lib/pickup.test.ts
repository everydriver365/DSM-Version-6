import { describe, expect, test } from "bun:test";
import { buildPickup, getPickupParts } from "./pickup";


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

  test("removes trailing commas from address before appending postcode", () => {
    expect(buildPickup(null, "1 High Street,", "SO52 9EW")).toBe("1 High Street, SO52 9EW");
    expect(buildPickup(null, "1 High Street,,  ", "SO52 9EW")).toBe("1 High Street, SO52 9EW");
  });

  test("removes trailing commas when postcode is already in address", () => {
    expect(buildPickup(null, "1 High Street, SO52 9EW,", "SO52 9EW")).toBe("1 High Street, SO52 9EW");
  });
});

describe("getPickupParts", () => {
  test("returns both address and postcode separately when available", () => {
    const parts = getPickupParts(null, "1 High Street", "SO52 9EW");
    expect(parts.address).toBe("1 High Street");
    expect(parts.postcode).toBe("SO52 9EW");
    expect(parts.full).toBe("1 High Street, SO52 9EW");
    expect(parts.hasBoth).toBe(true);
  });

  test("returns postcode as null when it is already in the address", () => {
    const parts = getPickupParts(null, "1 High Street, SO52 9EW", "SO52 9EW");
    expect(parts.address).toBe("1 High Street, SO52 9EW");
    expect(parts.postcode).toBeNull();
    expect(parts.hasBoth).toBe(false);
  });

  test("returns only pickup location when provided", () => {
    const parts = getPickupParts("School gate", "1 High Street", "SO52 9EW");
    expect(parts.address).toBe("School gate");
    expect(parts.postcode).toBeNull();
    expect(parts.hasBoth).toBe(false);
  });

  test("returns No pickup when both fields are empty", () => {
    const parts = getPickupParts(null, "", "");
    expect(parts.address).toBe("No pickup");
    expect(parts.postcode).toBeNull();
    expect(parts.hasBoth).toBe(false);
  });
});

