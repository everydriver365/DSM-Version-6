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
import { ChevronLeft, Info, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

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
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [failures, setFailures] = useState<{ row: number; reason: string }[]>([]);

  const rows: Row[] = useMemo(
    () => (mapping ? records.map((cells) => applyMapping(mapping, cells)) : []),
    [mapping, records],
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const downloadTemplate = () => {
    const csv = HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pupils_template.csv";
    a.click();
    URL.revokeObjectURL(url);
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


  const runImport = async () => {
    if (!userId || rows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setProcessed(0);
    setLiveSuccess(0);
    setLiveFailed(0);
    setFailures([]);
    setSuccessCount(null);

    let success = 0;
    const fails: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r.name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
      if (!name) {
        fails.push({ row: i + 2, reason: "Missing name" });
      } else {
        const payload: Record<string, unknown> = {
          instructor_id: userId,
          name,
          first_name: r.first_name?.trim() || null,
          last_name: r.last_name?.trim() || null,
          phone: r.phone?.trim() || null,
          email: r.email?.trim() || null,
          status: r.status?.trim() || "active",
        };
        const { error } = await supabase.from("pupils").insert(payload);
        if (error) fails.push({ row: i + 2, reason: error.message });
        else success++;
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
      setProcessed(i + 1);
      setLiveSuccess(success);
      setLiveFailed(fails.length);
    }

    setSuccessCount(success);
    setFailures(fails);
    setImporting(false);
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
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

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
            <Info size={20} color="#1877D6" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="text-[13px] text-[#0B1F3A]">
              Upload a CSV file to import pupils in bulk. Download the template below to get started.
            </div>
          </div>

          <div className="mt-3">
            <Button variant="ghost" onClick={downloadTemplate}>
              Download template
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
            <Upload size={28} color="#6B7280" />
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
                    {preview.map((r, i) => (
                      <tr key={i} style={{ borderTop: "0.5px solid #EEF2F7" }}>
                        {HEADERS.map((h) => (
                          <td key={h} className="px-2 py-2 text-[#0B1F3A] whitespace-nowrap">{r[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <Button
                  onClick={runImport}
                  disabled={importing || !userId || parseErrors.length > 0}
                >
                  {importing ? `Importing… ${progress}%` : `Import ${rows.length} pupils`}
                </Button>
              </div>

              {importing && (
                <div
                  className="mt-3 w-full"
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
              )}
            </div>
          )}

          {/* SUCCESS */}
          {successCount !== null && !importing && (
            <div
              className="mt-4 flex items-center"
              style={{
                gap: 10,
                backgroundColor: "#F3F8FF",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#1877D6",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <CheckCircle2 size={20} color="#1877D6" />
              <div className="text-[13px] text-[#0B1F3A] font-medium">
                {successCount} pupils imported successfully
              </div>
            </div>
          )}

          {/* FAILURES */}
          {failures.length > 0 && !importing && (
            <div
              className="mt-3"
              style={{
                backgroundColor: "#FEF2F2",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#1877D6",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div className="flex items-center" style={{ gap: 8 }}>
                <AlertCircle size={18} color="#1877D6" />
                <div className="text-[13px] font-semibold text-[#7F1D1D]">
                  {failures.length} row{failures.length === 1 ? "" : "s"} failed
                </div>
              </div>
              <div className="mt-2 flex flex-col" style={{ gap: 4 }}>
                {failures.map((f, i) => (
                  <div key={i} className="text-[12px] text-[#7F1D1D]">
                    Row {f.row}: {f.reason}
                  </div>
                ))}
              </div>
            </div>
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
