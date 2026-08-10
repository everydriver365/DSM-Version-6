import { useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Download, X } from "lucide-react";
import {
  PUPIL_FIELDS,
  FIELD_LABELS,
  type PupilField,
} from "@/lib/csvColumnMapping";
import { validatePupilRow, resolveName } from "@/lib/pupilRowValidation";

export type ImportRowData = Record<PupilField, string>;

export type ImportedResult = { row: number; name: string };
export type FailedResult = { row: number; reason: string; data: ImportRowData };

type Props = {
  imported: ImportedResult[];
  failed: FailedResult[];
  retrying: boolean;
  onRetry: (rows: FailedResult[]) => void;
  onDismiss?: () => void;
};

const EDITABLE: PupilField[] = ["name", "first_name", "last_name", "phone", "email", "status"];

export default function ImportResults({
  imported,
  failed,
  retrying,
  onRetry,
  onDismiss,
}: Props) {
  const [tab, setTab] = useState<"imported" | "failed">(failed.length > 0 ? "failed" : "imported");
  const [edits, setEdits] = useState<Record<number, ImportRowData>>({});

  const rowsForRetry = useMemo(
    () => failed.map((f) => ({ ...f, data: edits[f.row] ?? f.data })),
    [failed, edits],
  );

  const validations = useMemo(
    () => rowsForRetry.map((f) => validatePupilRow(f.data)),
    [rowsForRetry],
  );
  const fixableCount = validations.filter((v) => v.valid).length;

  const setField = (row: number, field: PupilField, value: string) => {
    setEdits((prev) => {
      const base = prev[row] ?? failed.find((f) => f.row === row)!.data;
      return { ...prev, [row]: { ...base, [field]: value } };
    });
  };

  const downloadFailed = () => {
    const header = PUPIL_FIELDS.join(",") + ",error";
    const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
    const body = rowsForRetry
      .map((f) => PUPIL_FIELDS.map((k) => esc(f.data[k] ?? "")).concat(esc(f.reason)).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + "\n" + body + "\n"], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "failed_pupils.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabBtn = (key: "imported" | "failed", label: string, count: number, colour: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className="flex-1 text-[13px] font-semibold"
      style={{
        height: 38,
        borderRadius: 999,
        backgroundColor: tab === key ? colour : "transparent",
        color: tab === key ? "#FFFFFF" : "#6B7280",
      }}
    >
      {label} · {count}
    </button>
  );

  return (
    <div
      className="mt-4"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        boxShadow: "0 2px 10px rgba(11,31,58,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ backgroundColor: "#0B1F3A", padding: "14px 16px" }}
      >
        <div>
          <div className="text-[15px] font-semibold text-white">Import results</div>
          <div className="text-[12px]" style={{ color: "#9FB6D4" }}>
            {imported.length} imported · {failed.length} failed
          </div>
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss results">
            <X size={18} color="#9FB6D4" />
          </button>
        )}
      </div>

      <div className="px-4 pt-3">
        <div
          className="flex"
          style={{ gap: 4, backgroundColor: "#F3F5F9", borderRadius: 999, padding: 4 }}
        >
          {tabBtn("imported", "Imported", imported.length, "#1877D6")}
          {tabBtn("failed", "Failed", failed.length, "#CC2229")}
        </div>
      </div>

      {/* Imported list */}
      {tab === "imported" && (
        <div className="px-4 py-3 flex flex-col" style={{ gap: 6 }}>
          {imported.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-6">
              No rows were imported.
            </div>
          ) : (
            imported.map((r) => (
              <div
                key={r.row}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  backgroundColor: "#F7F9FC",
                }}
              >
                <CheckCircle2 size={16} color="#1877D6" />
                <div className="text-[13px] text-[#0B1F3A] font-medium flex-1 truncate">
                  {r.name}
                </div>
                <div className="text-[11px] text-[#9AA3AF]">Row {r.row}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Failed list */}
      {tab === "failed" && (
        <div className="px-4 py-3 flex flex-col" style={{ gap: 10 }}>
          {failed.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-6">
              Nothing failed — every row imported.
            </div>
          ) : (
            <>
              {rowsForRetry.map((f, i) => {
                const v = validations[i];
                return (
                  <div
                    key={f.row}
                    style={{
                      borderRadius: 14,
                      backgroundColor: v.valid ? "#F3F8FF" : "#FEF2F7",
                      padding: 12,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-semibold text-[#0B1F3A]">
                        Row {f.row}
                        {resolveName(f.data) ? ` · ${resolveName(f.data)}` : ""}
                      </div>
                      <div
                        className="text-[11px] font-semibold"
                        style={{ color: v.valid ? "#1877D6" : "#CC2229" }}
                      >
                        {v.valid ? "Ready to retry" : "Needs fixing"}
                      </div>
                    </div>

                    <div className="mt-1 flex items-start" style={{ gap: 6 }}>
                      <AlertCircle size={14} color="#CC2229" style={{ marginTop: 2 }} />
                      <div className="text-[12px]" style={{ color: "#7F1D1D" }}>
                        {f.reason}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
                      {EDITABLE.map((field) => {
                        const fieldErr =
                          field === "name" || field === "phone" || field === "email"
                            ? v.errorByField[field]
                            : undefined;
                        return (
                          <div key={field}>
                            <div className="text-[10px] uppercase tracking-wide text-[#6B7280]">
                              {FIELD_LABELS[field]}
                            </div>
                            <input
                              value={f.data[field] ?? ""}
                              onChange={(e) => setField(f.row, field, e.target.value)}
                              className="w-full text-[13px] text-[#0B1F3A]"
                              style={{
                                marginTop: 2,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: "#FFFFFF",
                                borderWidth: "0.5px",
                                borderStyle: "solid",
                                borderColor: fieldErr ? "#CC2229" : "#E4E9F0",
                                padding: "0 10px",
                              }}
                            />
                            {fieldErr && (
                              <div className="text-[10px] mt-1" style={{ color: "#CC2229" }}>
                                {fieldErr}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center" style={{ gap: 8 }}>
                <button
                  type="button"
                  disabled={retrying || fixableCount === 0}
                  onClick={() => onRetry(rowsForRetry.filter((_, i) => validations[i].valid))}
                  className="flex-1 flex items-center justify-center text-[14px] font-semibold text-white"
                  style={{
                    gap: 8,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: fixableCount === 0 ? "#9AA3AF" : "#1877D6",
                    opacity: retrying ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={16} />
                  {retrying ? "Retrying…" : `Retry ${fixableCount} fixed row${fixableCount === 1 ? "" : "s"}`}
                </button>
                <button
                  type="button"
                  onClick={downloadFailed}
                  aria-label="Download failed rows as CSV"
                  className="flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "#F3F5F9",
                  }}
                >
                  <Download size={18} color="#0B1F3A" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
