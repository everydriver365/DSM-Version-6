export type ValidatedField = "name" | "phone" | "email";

export type RowIssue = {
  field: ValidatedField;
  severity: "error" | "warning";
  message: string;
};

export type RowValidation = {
  issues: RowIssue[];
  errors: RowIssue[];
  warnings: RowIssue[];
  valid: boolean;
  errorByField: Partial<Record<ValidatedField, string>>;
  warningByField: Partial<Record<ValidatedField, string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function normalisePhone(raw: string): string {
  return (raw || "").replace(/[\s()\-.]/g, "");
}

export function isValidUkPhone(raw: string): boolean {
  const p = normalisePhone(raw);
  if (!p) return false;
  if (!/^\+?\d+$/.test(p)) return false;
  const digits = p.startsWith("+44") ? `0${p.slice(3)}` : p.startsWith("+") ? p.slice(1) : p;
  return digits.length >= 10 && digits.length <= 13;
}

export function isValidEmail(raw: string): boolean {
  const e = (raw || "").trim();
  return e.length <= 255 && EMAIL_RE.test(e);
}

export function resolveName(row: {
  name?: string;
  first_name?: string;
  last_name?: string;
}): string {
  return (
    row.name?.trim() ||
    [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ").trim()
  );
}

/** Validates a single mapped CSV row. Errors block import; warnings do not. */
export function validatePupilRow(
  row: { name?: string; first_name?: string; last_name?: string; phone?: string; email?: string },
  opts: { duplicateEmail?: boolean; duplicatePhone?: boolean } = {},
): RowValidation {
  const issues: RowIssue[] = [];

  const name = resolveName(row);
  if (!name) {
    issues.push({ field: "name", severity: "error", message: "Name is required" });
  } else if (name.length < 2) {
    issues.push({ field: "name", severity: "error", message: "Name is too short" });
  } else if (name.length > 100) {
    issues.push({ field: "name", severity: "error", message: "Name must be under 100 characters" });
  }

  const phone = (row.phone || "").trim();
  if (phone && !isValidUkPhone(phone)) {
    issues.push({ field: "phone", severity: "error", message: "Phone number looks invalid" });
  } else if (opts.duplicatePhone) {
    issues.push({ field: "phone", severity: "warning", message: "Duplicate phone in this file" });
  }

  const email = (row.email || "").trim();
  if (email && !isValidEmail(email)) {
    issues.push({ field: "email", severity: "error", message: "Email address looks invalid" });
  } else if (opts.duplicateEmail) {
    issues.push({ field: "email", severity: "warning", message: "Duplicate email in this file" });
  }

  if (!phone && !email) {
    issues.push({
      field: "phone",
      severity: "warning",
      message: "No phone or email — you won't be able to contact this pupil",
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const errorByField: Partial<Record<ValidatedField, string>> = {};
  const warningByField: Partial<Record<ValidatedField, string>> = {};
  errors.forEach((e) => { if (!errorByField[e.field]) errorByField[e.field] = e.message; });
  warnings.forEach((w) => { if (!warningByField[w.field]) warningByField[w.field] = w.message; });

  return { issues, errors, warnings, valid: errors.length === 0, errorByField, warningByField };
}

/** Validates every row, flagging duplicate phone/email values within the file. */
export function validatePupilRows(
  rows: { name?: string; first_name?: string; last_name?: string; phone?: string; email?: string }[],
): RowValidation[] {
  const emailCounts = new Map<string, number>();
  const phoneCounts = new Map<string, number>();
  rows.forEach((r) => {
    const e = (r.email || "").trim().toLowerCase();
    if (e) emailCounts.set(e, (emailCounts.get(e) || 0) + 1);
    const p = normalisePhone(r.phone || "");
    if (p) phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
  });
  return rows.map((r) =>
    validatePupilRow(r, {
      duplicateEmail: (emailCounts.get((r.email || "").trim().toLowerCase()) || 0) > 1,
      duplicatePhone: (phoneCounts.get(normalisePhone(r.phone || "")) || 0) > 1,
    }),
  );
}
