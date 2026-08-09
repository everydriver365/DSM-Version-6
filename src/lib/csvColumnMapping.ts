export const PUPIL_FIELDS = [
  "name",
  "first_name",
  "last_name",
  "phone",
  "email",
  "status",
] as const;

export type PupilField = (typeof PUPIL_FIELDS)[number];

export const FIELD_LABELS: Record<PupilField, string> = {
  name: "Full name",
  first_name: "First name",
  last_name: "Last name",
  phone: "Phone",
  email: "Email",
  status: "Status",
};

/** Common header spellings seen in Total Drive / Drive / spreadsheet exports. */
const ALIASES: Record<PupilField, string[]> = {
  name: [
    "name", "fullname", "full name", "pupil", "pupil name", "pupilname",
    "student", "student name", "studentname", "client", "client name",
    "customer", "customer name", "contact", "contact name", "display name",
  ],
  first_name: [
    "first name", "firstname", "first", "forename", "fore name",
    "given name", "givenname", "fname", "christian name",
  ],
  last_name: [
    "last name", "lastname", "last", "surname", "sur name",
    "family name", "familyname", "lname", "second name",
  ],
  phone: [
    "phone", "phone number", "phonenumber", "mobile", "mobile number",
    "mobile no", "tel", "telephone", "telephone number", "cell",
    "cell phone", "contact number", "contact no", "number", "msisdn",
  ],
  email: [
    "email", "e mail", "email address", "emailaddress", "mail",
    "e mail address", "contact email",
  ],
  status: [
    "status", "pupil status", "state", "stage", "type", "category",
    "lesson status", "active", "archived",
  ],
};

export function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 0..1 similarity based on Levenshtein distance. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

export type FieldMatch = {
  /** index in the CSV header row, or -1 when unmatched */
  index: number;
  confidence: number;
  /** how the match was made */
  via: "exact" | "alias" | "contains" | "fuzzy" | "none";
};

export type ColumnMapping = Record<PupilField, FieldMatch>;

function scoreHeader(field: PupilField, header: string): FieldMatch["via"] | null {
  const aliases = ALIASES[field];
  if (header === field.replace(/_/g, " ") || header === field) return "exact";
  if (aliases.includes(header)) return "alias";
  if (aliases.some((a) => a.length >= 4 && (header.includes(a) || a.includes(header)))) {
    return "contains";
  }
  return null;
}

/**
 * Automatically map raw CSV headers onto pupil fields.
 * Each CSV column is used at most once; best confidence wins.
 */
export function autoMapColumns(rawHeaders: string[]): ColumnMapping {
  const headers = rawHeaders.map(normaliseHeader);
  const mapping = {} as ColumnMapping;
  const used = new Set<number>();

  type Candidate = { field: PupilField; index: number; confidence: number; via: FieldMatch["via"] };
  const candidates: Candidate[] = [];

  PUPIL_FIELDS.forEach((field) => {
    headers.forEach((h, index) => {
      if (!h) return;
      const via = scoreHeader(field, h);
      if (via) {
        const confidence = via === "exact" ? 1 : via === "alias" ? 0.95 : 0.8;
        candidates.push({ field, index, confidence, via });
        return;
      }
      const best = Math.max(
        similarity(h, field.replace(/_/g, " ")),
        ...ALIASES[field].map((a) => similarity(h, a)),
      );
      if (best >= 0.78) candidates.push({ field, index, confidence: best, via: "fuzzy" });
    });
  });

  candidates.sort((a, b) => b.confidence - a.confidence);
  const takenFields = new Set<PupilField>();
  for (const c of candidates) {
    if (used.has(c.index) || takenFields.has(c.field)) continue;
    used.add(c.index);
    takenFields.add(c.field);
    mapping[c.field] = { index: c.index, confidence: c.confidence, via: c.via };
  }

  PUPIL_FIELDS.forEach((f) => {
    if (!mapping[f]) mapping[f] = { index: -1, confidence: 0, via: "none" };
  });

  // A single "name" column also satisfies first/last name, and vice versa.
  return mapping;
}

export function mappingIsUsable(mapping: ColumnMapping): boolean {
  return (
    mapping.name.index >= 0 ||
    mapping.first_name.index >= 0 ||
    mapping.last_name.index >= 0
  );
}

export function applyMapping(
  mapping: ColumnMapping,
  cells: string[],
): Record<PupilField, string> {
  const out = {} as Record<PupilField, string>;
  PUPIL_FIELDS.forEach((f) => {
    const idx = mapping[f].index;
    out[f] = idx >= 0 ? (cells[idx] ?? "").trim() : "";
  });
  return out;
}
