import { describe, test, expect } from "bun:test";
import {
  parsePostcode,
  proximity,
  proximityToNeighbours,
  proximityLabel,
} from "./travel";

describe("parsePostcode", () => {
  test("splits a full postcode", () => {
    expect(parsePostcode("SW1A 2AA")).toEqual({
      area: "SW",
      district: "SW1A",
      sector: "SW1A 2",
    });
  });

  test("handles missing space and lower case", () => {
    expect(parsePostcode("m11ae")?.district).toBe("M1");
  });

  test("handles an outward code only", () => {
    expect(parsePostcode("LS6")).toEqual({ area: "LS", district: "LS6", sector: null });
  });

  test("rejects rubbish", () => {
    expect(parsePostcode("not a postcode")).toBeNull();
    expect(parsePostcode(null)).toBeNull();
  });
});

describe("proximity", () => {
  test("same sector", () => {
    expect(proximity("LS6 2AB", "LS6 2ZZ")).toBe("same-sector");
  });
  test("same district", () => {
    expect(proximity("LS6 2AB", "LS6 4ZZ")).toBe("same-district");
  });
  test("same area", () => {
    expect(proximity("LS6 2AB", "LS12 4ZZ")).toBe("same-area");
  });
  test("different area is far", () => {
    expect(proximity("LS6 2AB", "M1 1AE")).toBe("far");
  });
  test("missing postcode is unknown", () => {
    expect(proximity(null, "M1 1AE")).toBe("unknown");
  });
});

describe("proximityToNeighbours", () => {
  test("takes the closer of the two neighbouring lessons", () => {
    expect(proximityToNeighbours("LS6 2AB", "M1 1AE", "LS6 2ZZ")).toBe("same-sector");
  });
  test("unknown when there are no neighbouring lessons", () => {
    expect(proximityToNeighbours("LS6 2AB", null, null)).toBe("unknown");
  });
  test("unknown produces no label", () => {
    expect(proximityLabel("unknown")).toBe("");
  });
});
