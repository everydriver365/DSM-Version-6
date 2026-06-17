import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/")({
  head: () => ({
    meta: [
      { title: "Pupils — DSM by EveryDriver" },
      { name: "description", content: "Manage your pupils and their lesson history." },
    ],
  }),
  component: PupilsIndexPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lesson_count: number | null;
  balance_owed: number | null;
  status: string | null;
}

type StatusKey = "active" | "passed" | "inactive" | "archived";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

function statusBadgeColor(status: StatusKey) {
  if (status === "active") return "#16A34A";
  if (status === "passed") return "#1A52A0";
  return "#6B7280";
}

function PupilsIndexPage() {
  const [pupils, setPupils] = useState<Pupil[] | null>(null);
  const [tab, setTab] = useState<StatusKey>("active");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error("[pupils] auth error", authErr);
      const uid = auth?.user?.id;
      if (!uid) {
        console.warn("[pupils] no authenticated user");
        setPupils([]);
        return;
      }
      const { data, error } = await supabase
        .from("pupils")
        .select("id, name, first_name, last_name, phone, email, lesson_count, balance_owed, status")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .order("name", { ascending: true, nullsFirst: false });
      if (error) console.error("[pupils] fetch error", error);
      const rows = (data ?? []) as Array<Pupil & { first_name?: string | null; last_name?: string | null }>;
      // Fallback to first_name + last_name when name is null
      const normalized: Pupil[] = rows.map((p) => ({
        ...p,
        name:
          p.name && p.name.trim()
            ? p.name
            : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed",
      }));
      setPupils(normalized);
    })();
  }, []);


  const filtered = useMemo(() => {
    if (!pupils) return null;
    const q = query.trim().toLowerCase();
    return pupils.filter((p) => {
      const status = (p.status ?? "active").toLowerCase() as StatusKey;
      if (status !== tab) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pupils, tab, query]);

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe relative" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white" style={POPPINS}>
            DSM
          </span>
          <span className="text-[15px] text-white" style={POPPINS}>
            Pupils
          </span>
        </div>
        <button
          type="button"
          aria-label={searchOpen ? "Close search" : "Open search"}
          onClick={() => {
            setSearchOpen((v) => {
              const next = !v;
              if (!next) setQuery("");
              return next;
            });
          }}
          className="flex items-center justify-center"
          style={{ width: 32, height: 32 }}
        >
          {searchOpen ? (
            <X size={20} color="#FFFFFF" />
          ) : (
            <Search size={20} color="#FFFFFF" />
          )}
        </button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 pt-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pupils..."
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
            style={{
              ...POPPINS,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#E2E6ED",
            }}
          />
        </div>
      )}

      {/* Segmented control */}
      <div className="px-4 pt-3">
        <div
          className="flex w-full rounded-lg p-0.5"
          style={{
            backgroundColor: "#F8F9FB",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#E2E6ED",
          }}
        >
          {(
            [
              { k: "active", label: "Active" },
              { k: "passed", label: "Passed" },
              { k: "inactive", label: "Inactive" },
            ] as { k: StatusKey; label: string }[]
          ).map((s) => {
            const active = tab === s.k;
            return (
              <button
                key={s.k}
                type="button"
                onClick={() => setTab(s.k)}
                className="flex-1 h-9 rounded-md text-[13px] font-medium transition-colors"
                style={{
                  ...POPPINS,
                  backgroundColor: active ? "#FFFFFF" : "transparent",
                  color: active ? "#0F2044" : "#6B7280",
                  borderWidth: active ? "0.5px" : 0,
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="px-4 pt-4">
        {filtered === null ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white flex items-center gap-3"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                <div
                  className="skeleton-pulse rounded-full shrink-0"
                  style={{ width: 40, height: 40, backgroundColor: "#E2E6ED" }}
                />
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div
                    className="skeleton-pulse"
                    style={{
                      height: 14,
                      width: "60%",
                      backgroundColor: "#E2E6ED",
                      borderRadius: 4,
                    }}
                  />
                  <div
                    className="skeleton-pulse"
                    style={{
                      height: 12,
                      width: "40%",
                      backgroundColor: "#E2E6ED",
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No pupils
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((p) => {
              const status = ((p.status ?? "active").toLowerCase() as StatusKey);
              const balance = Number(p.balance_owed ?? 0);
              const lessons = Number(p.lesson_count ?? 0);
              return (
                <Link
                  key={p.id}
                  to="/pupils/$id"
                  params={{ id: p.id }}
                  className="block"
                >
                  <Card>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center rounded-full shrink-0 text-[13px] font-semibold"
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: "#1A52A0",
                          color: "#FFFFFF",
                          ...POPPINS,
                        }}
                      >
                        {initials(p.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-[14px] font-semibold text-[#0F2044] truncate"
                          style={POPPINS}
                        >
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[11px] text-white px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: statusBadgeColor(status), ...POPPINS }}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                          {balance > 0 && (
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: "#CC2229", ...POPPINS }}
                            >
                              £{balance.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="text-[12px] text-[#6B7280] shrink-0 text-right"
                        style={POPPINS}
                      >
                        {lessons} {lessons === 1 ? "lesson" : "lessons"}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* FAB */}
      <Link
        to="/pupils/new"
        aria-label="Add pupil"
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          backgroundColor: "#1A52A0",
          color: "#FFFFFF",
          right: 16,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </Link>
    </div>
  );
}
