import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PUPIL_FIELDS,
  FIELD_LABELS,
  autoMapColumns,
  applyMapping,
  mappingIsUsable,
  type ColumnMapping,
  type PupilField,
} from "@/lib/csvColumnMapping";
import { validatePupilRows, resolveName } from "@/lib/pupilRowValidation";
import { IconAlertCircle, IconAlertTriangle, IconChevronLeft, IconCircleCheck, IconDownload, IconInfoCircle, IconUpload } from "@tabler/icons-react";

import { toast } from "sonner";
import InstructorTopBar, { TOP_BAR_SPACER } from "@/components/dsm/InstructorTopBar";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import ImportResults, {
  type FailedResult,
  type ImportedResult,
} from "@/components/dsm/ImportResults";

export const Route = createFileRoute("/dataimport")({
  head: () => ({
    meta: [
      { title: "Import data — DSM by EveryDriver" },
      { name: "description", content: "Bulk import pupils from a CSV file." },
    ],
  }),
  component: DataImportPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const HEADERS = PUPIL_FIELDS;
type Row = Record<PupilField, string>;

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCSV(text: string): { headers: string[]; records: string[][]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], records: [], errors: ["File is empty."] };

  const headers = splitLine(lines[0]);
  const records = lines.slice(1).map(splitLine);
  if (records.length === 0) errors.push("No data rows found below the header row.");
  return { headers, records, errors };
}

function DataImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [liveSuccess, setLiveSuccess] = useState(0);
  const [liveFailed, setLiveFailed] = useState(0);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [failures, setFailures] = useState<FailedResult[]>([]);
  const [importedRows, setImportedRows] = useState<ImportedResult[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const rows: Row[] = useMemo(
    () => (mapping ? records.map((cells) => applyMapping(mapping, cells)) : []),
    [mapping, records],
  );

  const validations = useMemo(() => validatePupilRows(rows), [rows]);
  const invalidRowCount = useMemo(() => validations.filter((v) => !v.valid).length, [validations]);
  const warningRowCount = useMemo(
    () => validations.filter((v) => v.valid && v.warnings.length > 0).length,
    [validations],
  );
  const validRowCount = rows.length - invalidRowCount;
  const invalidList = useMemo(
    () =>
      validations
        .map((v, i) => ({ row: i + 2, issues: v.errors }))
        .filter((x) => x.issues.length > 0),
    [validations],
  );


  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const downloadTemplate = () => {
    const header = HEADERS.join(",");
    const sample = [
      "John Smith",
      "John",
      "Smith",
      "07700 900123",
      "john.smith@example.com",
      "active",
    ].join(",");
    const csv = `${header}\n${sample}\n`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pupils_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setSuccessCount(null);
    setFailures([]);
    setFileName(f.name);
    const text = await f.text();
    const { headers, records, errors } = parseCSV(text);
    const auto = headers.length ? autoMapColumns(headers) : null;
    setCsvHeaders(headers);
    setRecords(records);
    setMapping(auto);
    const errs = [...errors];
    if (auto && !mappingIsUsable(auto)) {
      errs.push("Couldn't find a name column — pick one below before importing.");
    }
    setParseErrors(errs);
    if (auto) {
      const matched = PUPIL_FIELDS.filter((f2) => auto[f2].index >= 0).length;
      if (matched > 0) toast.success(`Matched ${matched} of ${PUPIL_FIELDS.length} columns automatically`);
    }
  };

  const setFieldColumn = (field: PupilField, index: number) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const next = { ...prev } as ColumnMapping;
      // A CSV column can only feed one field.
      if (index >= 0) {
        PUPIL_FIELDS.forEach((f2) => {
          if (f2 !== field && next[f2].index === index) {
            next[f2] = { index: -1, confidence: 0, via: "none" };
          }
        });
      }
      next[field] = { index, confidence: index >= 0 ? 1 : 0, via: index >= 0 ? "exact" : "none" };
      setParseErrors((errs) =>
        errs.filter((e) => !e.startsWith("Couldn't find a name column")).concat(
          mappingIsUsable(next) ? [] : ["Couldn't find a name column — pick one below before importing."],
        ),
      );
      return next;
    });
  };


  const insertRow = async (r: Row) => {
    const payload: Record<string, unknown> = {
      instructor_id: userId,
      name: resolveName(r),
      first_name: r.first_name?.trim() || null,
      last_name: r.last_name?.trim() || null,
      phone: r.phone?.trim() || null,
      email: r.email?.trim() || null,
      status: r.status?.trim() || "active",
    };
    const { error } = await supabase.from("pupils").insert(payload);
    return error?.message ?? null;
  };

  const runImport = async () => {
    if (!userId || rows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setProcessed(0);
    setLiveSuccess(0);
    setLiveFailed(0);
    setFailures([]);
    setImportedRows([]);
    setSuccessCount(null);
    setShowResults(false);

    let success = 0;
    const fails: FailedResult[] = [];
    const ok: ImportedResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const v = validations[i];
      if (!v.valid) {
        fails.push({ row: i + 2, reason: v.errors.map((e) => e.message).join(", "), data: r });
      } else {
        const err = await insertRow(r);
        if (err) fails.push({ row: i + 2, reason: err, data: r });
        else {
          success++;
          ok.push({ row: i + 2, name: resolveName(r) });
        }
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
      setProcessed(i + 1);
      setLiveSuccess(success);
      setLiveFailed(fails.length);
    }

    setSuccessCount(success);
    setFailures(fails);
    setImportedRows(ok);
    setShowResults(true);
    setImporting(false);
  };

  const retryFailures = async (retryRows: FailedResult[]) => {
    if (!userId || retryRows.length === 0) return;
    setRetrying(true);
    const stillFailed: FailedResult[] = [];
    const newlyImported: ImportedResult[] = [];

    for (const f of retryRows) {
      const err = await insertRow(f.data as Row);
      if (err) stillFailed.push({ ...f, reason: err });
      else newlyImported.push({ row: f.row, name: resolveName(f.data) });
    }

    const retriedRowNumbers = new Set(retryRows.map((f) => f.row));
    setFailures((prev) => [
      ...prev.filter((f) => !retriedRowNumbers.has(f.row)),
      ...stillFailed,
    ].sort((a, b) => a.row - b.row));
    setImportedRows((prev) => [...prev, ...newlyImported].sort((a, b) => a.row - b.row));
    setSuccessCount((prev) => (prev ?? 0) + newlyImported.length);
    setRetrying(false);

    if (newlyImported.length > 0) {
      toast.success(`${newlyImported.length} row${newlyImported.length === 1 ? "" : "s"} imported on retry`);
    }
    if (stillFailed.length > 0) {
      toast.error(`${stillFailed.length} row${stillFailed.length === 1 ? "" : "s"} still failing`);
    }
  };




  const preview = rows.slice(0, 5);

  return (
    <PageLayout className="pb-8" style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="Import data"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "TOP_BAR_SPACER" }} />

      <div>
        <div className="mx-4">
          <SectionHeader>IMPORT PUPILS</SectionHeader>

          {/* INFO CARD */}
          <div
            style={{
              backgroundColor: "#EEF4FB",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#1877D6",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              gap: 12,
            }}
          >
            <IconInfoCircle size={20} color="#1877D6" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="text-[13px] text-[#0B1F3A]">
              IconUpload a CSV file to import pupils in bulk. IconDownload the template below to get started.
            </div>
          </div>

          <div className="mt-3">
            <Button onClick={downloadTemplate}>
              <IconDownload size={18} className="mr-2" />
              IconDownload CSV template
            </Button>
          </div>

          {/* UPLOAD AREA */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full mt-4 flex flex-col items-center justify-center"
            style={{
              borderWidth: "1px",
              borderStyle: "dashed",
              borderColor: "#EEF2F7",
              borderRadius: 12,
              padding: 32,
              gap: 8,
              backgroundColor: "#FAFBFC",
            }}
          >
            <IconUpload size={28} color="#6B7280" />
            <div className="text-[14px] text-[#6B7280]">
              {fileName ? fileName : "Tap to select CSV file"}
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />

          {parseErrors.length > 0 && (
            <div
              className="mt-3 text-[12px]"
              style={{ color: "#1877D6" }}
            >
              {parseErrors.map((er, i) => <div key={i}>{er}</div>)}
            </div>
          )}

          {/* COLUMN MAPPING */}
          {mapping && csvHeaders.length > 0 && (
            <div className="mt-4">
              <div className="text-[12px] font-semibold text-[#6B7280] mb-2">
                COLUMN MAPPING (auto-detected)
              </div>
              <div
                className="flex flex-col"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {PUPIL_FIELDS.map((f, i) => {
                  const m = mapping[f];
                  const auto = m.index >= 0;
                  return (
                    <div
                      key={f}
                      className="flex items-center justify-between px-3 py-2.5"
                      style={{ borderTop: i === 0 ? undefined : "0.5px solid #EEF2F7", gap: 10 }}
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#0B1F3A]">{FIELD_LABELS[f]}</div>
                        <div className="text-[11px]" style={{ color: auto ? "#1877D6" : "#9AA3AF" }}>
                          {auto
                            ? m.via === "exact"
                              ? "Exact match"
                              : m.via === "fuzzy"
                                ? `Best guess (${Math.round(m.confidence * 100)}%)`
                                : "Matched by name"
                            : "Not mapped"}
                        </div>
                      </div>
                      <select
                        value={m.index}
                        onChange={(e) => setFieldColumn(f, Number(e.target.value))}
                        className="text-[13px] text-[#0B1F3A]"
                        style={{
                          maxWidth: "55%",
                          padding: "6px 8px",
                          borderRadius: 8,
                          borderWidth: "0.5px",
                          borderStyle: "solid",
                          borderColor: auto ? "#1877D6" : "#E4E4E8",
                          backgroundColor: auto ? "#F3F8FF" : "#FAFBFC",
                        }}
                      >
                        <option value={-1}>— Skip —</option>
                        {csvHeaders.map((h, idx) => (
                          <option key={idx} value={idx}>
                            {h || `Column ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* VALIDATION SUMMARY */}
          {rows.length > 0 && (
            <div
              className="mt-4"
              style={{
                backgroundColor: "#FFFFFF",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: invalidRowCount > 0 ? "#CC2229" : "#EEF2F7",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div className="flex items-center" style={{ gap: 10 }}>
                {invalidRowCount > 0 ? (
                  <IconAlertCircle size={20} color="#CC2229" />
                ) : (
                  <IconCircleCheck size={20} color="#1877D6" />
                )}
                <div className="text-[13px] font-semibold text-[#0B1F3A]">
                  {invalidRowCount > 0
                    ? `${invalidRowCount} row${invalidRowCount === 1 ? "" : "s"} need fixing`
                    : "All rows look good"}
                </div>
              </div>
              <div className="mt-1 text-[12px] text-[#6B7280]">
                {validRowCount} of {rows.length} rows ready to import
                {warningRowCount > 0 ? ` · ${warningRowCount} with warnings` : ""}
                {invalidRowCount > 0 ? " · invalid rows will be skipped" : ""}
              </div>

              {invalidList.length > 0 && (
                <div className="mt-3 flex flex-col" style={{ gap: 6 }}>
                  {invalidList.slice(0, 20).map((x) => (
                    <div
                      key={x.row}
                      className="text-[12px]"
                      style={{
                        backgroundColor: "#FDF2F2",
                        borderRadius: 8,
                        padding: "8px 10px",
                        color: "#0B1F3A",
                      }}
                    >
                      <strong>Row {x.row}</strong>
                      {x.issues.map((iss, k) => (
                        <div key={k} style={{ color: "#CC2229" }}>
                          {FIELD_LABELS[iss.field as PupilField] ?? iss.field}: {iss.message}
                        </div>
                      ))}
                    </div>
                  ))}
                  {invalidList.length > 20 && (
                    <div className="text-[12px] text-[#6B7280]">
                      + {invalidList.length - 20} more rows with errors
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PREVIEW */}
          {rows.length > 0 && (
            <div className="mt-4">
              <div className="text-[12px] font-semibold text-[#6B7280] mb-2">
                PREVIEW ({rows.length} rows, showing first {preview.length})
              </div>
              <div
                className="overflow-x-auto"
                style={{
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                  borderRadius: 8,
                }}
              >
                <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F3F8FF" }}>
                      {HEADERS.map((h) => (
                        <th key={h} className="text-left px-2 py-2 text-[#0B1F3A] font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => {
                      const v = validations[i];
                      return (
                        <tr key={i} style={{ borderTop: "0.5px solid #EEF2F7" }}>
                          {HEADERS.map((h) => {
                            const err = (v?.errorByField as Record<string, string | undefined>)?.[h];
                            const warn = (v?.warningByField as Record<string, string | undefined>)?.[h];
                            return (
                              <td
                                key={h}
                                className="px-2 py-2 align-top"
                                style={{
                                  color: err ? "#CC2229" : "#0B1F3A",
                                  backgroundColor: err ? "#FDF2F2" : warn ? "#FFF8EC" : undefined,
                                  minWidth: 90,
                                }}
                              >
                                <div className="whitespace-nowrap">{r[h] || "—"}</div>
                                {(err || warn) && (
                                  <div
                                    className="flex items-start mt-0.5 text-[10px]"
                                    style={{ gap: 3, color: err ? "#CC2229" : "#B26B00", maxWidth: 170 }}
                                  >
                                    {err ? (
                                      <IconAlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    ) : (
                                      <IconAlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    )}
                                    <span>{err || warn}</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <Button
                  onClick={runImport}
                  disabled={importing || !userId || parseErrors.length > 0 || validRowCount === 0}
                >
                  {importing
                    ? `Importing… ${progress}%`
                    : validRowCount === 0
                      ? "Fix errors to import"
                      : `Import ${validRowCount} valid pupil${validRowCount === 1 ? "" : "s"}`}
                </Button>
              </div>


              {importing && (
                <div
                  className="mt-3"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-semibold text-[#0B1F3A]">
                      Importing {processed} of {rows.length}
                    </div>
                    <div className="text-[13px] font-semibold" style={{ color: "#1877D6" }}>
                      {progress}%
                    </div>
                  </div>

                  <div
                    className="mt-2 w-full"
                    style={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: "#EEF2F7",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: "#1877D6",
                        transition: "width 0.2s",
                      }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center" style={{ gap: 14 }}>
                    <div className="flex items-center" style={{ gap: 6 }}>
                      <IconCircleCheck size={16} color="#1877D6" />
                      <span className="text-[12px] text-[#0B1F3A]">
                        <strong>{liveSuccess}</strong> imported
                      </span>
                    </div>
                    <div className="flex items-center" style={{ gap: 6 }}>
                      <IconAlertCircle size={16} color={liveFailed > 0 ? "#CC2229" : "#9AA3AF"} />
                      <span
                        className="text-[12px]"
                        style={{ color: liveFailed > 0 ? "#CC2229" : "#6B7280" }}
                      >
                        <strong>{liveFailed}</strong> failed
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* RESULTS */}
          {showResults && !importing && (
            <ImportResults
              imported={importedRows}
              failed={failures}
              retrying={retrying}
              onRetry={retryFailures}
              onDismiss={() => setShowResults(false)}
            />
          )}


          <SectionHeader>IMPORT HISTORY</SectionHeader>
          <div
            className="text-[13px] text-[#6B7280] text-center py-6"
            style={{
              borderWidth: "0.5px",
              borderStyle: "dashed",
              borderColor: "#EEF2F7",
              borderRadius: 12,
            }}
          >
            Import history coming soon
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
