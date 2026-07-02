import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Info, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/dataimport")({
  head: () => ({
    meta: [
      { title: "Import data — DSM by EveryDriver" },
      { name: "description", content: "Bulk import pupils from a CSV file." },
    ],
  }),
  component: DataImportPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const HEADERS = ["name", "first_name", "last_name", "phone", "email", "status"] as const;
type Row = Record<(typeof HEADERS)[number], string>;

function parseCSV(text: string): { rows: Row[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: ["File is empty."] };

  const splitLine = (line: string): string[] => {
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
  };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const missing = HEADERS.filter((h) => !header.includes(h));
  if (missing.length) errors.push(`Missing columns: ${missing.join(", ")}`);

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: Row = { name: "", first_name: "", last_name: "", phone: "", email: "", status: "" };
    HEADERS.forEach((h) => {
      const idx = header.indexOf(h);
      if (idx >= 0) row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return { rows, errors };
}

function DataImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [failures, setFailures] = useState<{ row: number; reason: string }[]>([]);

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
    const { rows, errors } = parseCSV(text);
    setRows(rows);
    setParseErrors(errors);
  };

  const runImport = async () => {
    if (!userId || rows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setFailures([]);
    setSuccessCount(null);

    let success = 0;
    const fails: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r.name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
      if (!name) {
        fails.push({ row: i + 2, reason: "Missing name" });
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }
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
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setSuccessCount(success);
    setFailures(fails);
    setImporting(false);
  };

  const preview = rows.slice(0, 5);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[52px] flex items-center px-3 z-50"
        style={{ background: "#0B1F3A" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="p-1"
          aria-label="Back"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-white text-[16px] font-semibold">
          Import data
        </div>
      </div>

      <div className="pt-[52px]">
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
              style={{ color: "#CC2229" }}
            >
              {parseErrors.map((er, i) => <div key={i}>{er}</div>)}
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
                backgroundColor: "#ECFDF5",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#059669",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <CheckCircle2 size={20} color="#059669" />
              <div className="text-[13px] text-[#065F46] font-medium">
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
                borderColor: "#CC2229",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div className="flex items-center" style={{ gap: 8 }}>
                <AlertCircle size={18} color="#CC2229" />
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
    </div>
  );
}
