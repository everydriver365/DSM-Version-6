import { useMemo, useState } from "react";
import { tokens } from "@/lib/tokens";
import { IconSearch, IconX } from "@tabler/icons-react";
import { BottomSheet } from "../dsm/BottomSheetV2";

const navy = "#0B1F3A";
const blue = "#1877D6";
const hairline = "#E4E8EF";
const font = "Poppins, sans-serif";

export interface Pupil {
  id: string;
  name: string;
}

export interface PupilPickerSheetProps {
  open: boolean;
  onClose: () => void;
  pupils: Pupil[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function PupilPickerSheet({
  open,
  onClose,
  pupils,
  selectedId,
  onSelect,
}: PupilPickerSheetProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => p.name.toLowerCase().includes(q));
  }, [pupils, query]);

  if (!open) return null;

  return (
    <BottomSheet
      title="Select pupil"
      subtitle={`${pupils.length} pupil${pupils.length === 1 ? "" : "s"}`}
      onClose={onClose}
    >
      <div style={{ fontFamily: font }}>
        {/* Search */}
        <div
          className="flex items-center gap-3"
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 12,
            border: `1px solid ${hairline}`,
          }}
        >
          <IconSearch size={18} color="#9CA3AF" stroke={1.8} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pupils…"
            className="flex-1 bg-transparent focus:outline-none"
            style={{
              fontFamily: font,
              fontSize: 16,
              color: navy,
            }}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#E5E5EA",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <IconX size={14} color="#6B7686" stroke={2} />
            </button>
          )}
        </div>

        {/* Results */}
        <div
          className="bg-white overflow-hidden"
          style={{
            borderRadius: tokens.radiusCard,
            border: `1px solid ${hairline}`,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#6B7686",
                fontSize: 14,
                fontFamily: font,
              }}
            >
              No pupils found
            </div>
          ) : (
            filtered.map((p, i) => {
              const isSelected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 text-left active:bg-black/[0.03]"
                  style={{
                    padding: "14px 16px",
                    minHeight: 56,
                    borderTop: i === 0 ? "none" : `1px solid ${hairline}`,
                    background: isSelected ? "#F0F7FF" : "transparent",
                  }}
                >
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: "#E6F1FB",
                      color: blue,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {p.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{
                      fontFamily: font,
                      fontSize: 15,
                      fontWeight: 600,
                      color: navy,
                    }}
                  >
                    {p.name}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: blue,
                        color: "#fff",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
