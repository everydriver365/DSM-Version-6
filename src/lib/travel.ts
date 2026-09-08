// Travel awareness for gap filling.
//
// EveryDriver stores pupil postcodes, not coordinates, so proximity is judged
// from the structure of a UK postcode:
//
//   SW1A 2AA
//   ^^      area (SW)
//   ^^^     district (SW1A)
//   ^^^^^^  sector (SW1A 2)
//
// Two pupils in the same sector are a few minutes apart; the same district is
// a short hop; the same area is across town; different areas mean a long drive.
// This is a ranking heuristic, never a hard availability rule.

export type Proximity = "same-sector" | "same-district" | "same-area" | "far" | "unknown";

const POSTCODE_RE = /^([A-Z]{1,2})(\d[A-Z\d]?)(?:(\d)([A-Z]{2}))?$/;

export type PostcodeParts = {
  area: string;
  district: string;
  sector: string | null;
};

/** Split a UK postcode into area / district / sector. Null if unparseable. */
export function parsePostcode(raw: string | null | undefined): PostcodeParts | null {
  const clean = (raw ?? "").toUpperCase().replace(/\s+/g, "");
  if (!clean) return null;
  const m = POSTCODE_RE.exec(clean);
  if (!m) return null;
  const area = m[1];
  const district = area + m[2];
  const sector = m[3] ? `${district} ${m[3]}` : null;
  return { area, district, sector };
}

/** How close two postcodes are likely to be. */
export function proximity(
  a: string | null | undefined,
  b: string | null | undefined,
): Proximity {
  const pa = parsePostcode(a);
  const pb = parsePostcode(b);
  if (!pa || !pb) return "unknown";
  if (pa.sector && pb.sector && pa.sector === pb.sector) return "same-sector";
  if (pa.district === pb.district) return "same-district";
  if (pa.area === pb.area) return "same-area";
  return "far";
}

/** Lower is closer. Unknown sits between "across town" and "long drive". */
export function proximityRank(p: Proximity): number {
  switch (p) {
    case "same-sector":
      return 0;
    case "same-district":
      return 1;
    case "same-area":
      return 2;
    case "unknown":
      return 3;
    case "far":
      return 4;
  }
}

/** Short wording for the pupil list. Empty when there is nothing useful to say. */
export function proximityLabel(p: Proximity): string {
  switch (p) {
    case "same-sector":
      return "Right nearby";
    case "same-district":
      return "Short drive";
    case "same-area":
      return "Across town";
    case "far":
      return "Long drive";
    case "unknown":
      return "";
  }
}

/**
 * Closeness to the lessons either side of a gap. The best of the two wins,
 * because the instructor only has to reach the pupil from one of them.
 */
export function proximityToNeighbours(
  pupilPostcode: string | null | undefined,
  before: string | null | undefined,
  after: string | null | undefined,
): Proximity {
  const options = [before, after]
    .filter((p) => !!p)
    .map((p) => proximity(pupilPostcode, p));
  if (options.length === 0) return "unknown";
  return options.reduce((best, p) => (proximityRank(p) < proximityRank(best) ? p : best));
}
