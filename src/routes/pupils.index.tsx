import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Search, X, Megaphone, Users, CreditCard } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { EmptyState } from "../components/dsm/EmptyState";

export const Route = createFileRoute("/pupils/")({
  head: () => ({
    meta: [
      { title: "Pupils — DSM by EveryDriver" },
      { name: "description", content: "Manage your pupils and their lesson history." },
    ],
  }),
  component: PupilsIndexPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lesson_count: number | null;
  account_balance: number | null;
  prepaid_hours: number | null;
  ni_amount_total: number | null;
  ni_amount_paid: number | null;
  lead_source: string | null;
  status: string | null;
  profile_image_url: string | null;
}


type StatusKey = "active" | "passed" | "archived";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

function statusBadgeColor(status: StatusKey) {
  if (status === "active") return "#1877D6";
  if (status === "passed") return "#1877D6";
  if (status === "archived") return "#9CA3AF";
  return "#6B7280";
}

function accentColor(status: StatusKey) {
  if (status === "active") return "#1877D6";
  if (status === "passed") return "#1877D6";
  if (status === "archived") return "#9CA3AF";
  return "#9CA3AF";
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const days = Math.floor(seconds / 86400);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function PupilsIndexPage() {
  const [pupils, setPupils] = useState<Pupil[] | null>(null);
  const [lessonCountMap, setLessonCountMap] = useState<Record<string, number>>({});
  const [balanceMap, setBalanceMap] = useState<Record<string, number>>({});
  const [hoursMap, setHoursMap] = useState<Record<string, number>>({});
  const [lastPaymentMap, setLastPaymentMap] = useState<Record<string, { amount: number; method: string; date: string }>>({});
  const [tab, setTab] = useState<StatusKey>("active");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const channelName = `payment-updates-pupils-${userId}`;
    console.log('[realtime] pupils.index subscribing:', channelName);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lessons',
        filter: `instructor_id=eq.${userId}`,
      }, () => {
        if (cancelled) return;
        console.log('[realtime] lessons changed, refetching pupils balances...');
        setReloadKey((k) => k + 1);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lesson_history',
        filter: `instructor_id=eq.${userId}`,
      }, () => {
        if (cancelled) return;
        console.log('[realtime] lesson_history changed, refetching pupils balances...');
        setReloadKey((k) => k + 1);
      })
      .subscribe((status, err) => {
        console.log('[realtime] pupils.index channel status:', status, err ?? '');
      });
    return () => {
      cancelled = true;
      console.log('[realtime] pupils.index unsubscribing:', channelName);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('[realtime] pupils.index removeChannel failed:', e);
      }
    };
  }, [userId]);

  useEffect(() => {
    setPupils(null);
    (async () => {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error("[pupils] auth error", authErr);
      const uid = auth?.user?.id;
      if (!uid) {
        console.warn("[pupils] no authenticated user");
        setPupils([]);
        return;
      }
      let q = supabase
        .from("pupils")
        .select("id, name, first_name, last_name, phone, email, lesson_count, account_balance, prepaid_hours, ni_amount_total, ni_amount_paid, lead_source, status, deleted_at, postcode, custom_rate, custom_rate_90, custom_rate_120")
        .eq("instructor_id", uid)
        .order("name", { ascending: true, nullsFirst: false });

      if (tab === "archived") {
        q = q.or("deleted_at.not.is.null,status.eq.inactive,status.eq.cancelled");
      } else if (tab === "passed") {
        q = q.is("deleted_at", null).eq("status", "passed");
      } else {
        // active: not deleted and not passed/inactive/cancelled (NULL status counts as active)
        q = q
          .is("deleted_at", null)
          .or("status.is.null,and(status.neq.inactive,status.neq.passed,status.neq.cancelled)");
      }

      const { data, error } = await q;
      if (error) console.error("[pupils] fetch error", error);
      console.log("[pupils] fetch result:", data, error);
      const rows = (data ?? []) as Array<Pupil & { first_name?: string | null; last_name?: string | null; deleted_at?: string | null }>;
      const normalized: Pupil[] = rows.map((p) => ({
        ...p,
        name:
          p.name && p.name.trim()
            ? p.name
            : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed",
      }));
      setPupils(normalized);
      console.log("[pupils] first pupil prepaid_hours:", normalized[0]?.prepaid_hours, normalized[0]?.name);
      const joseph = normalized.find((p) => /joseph/i.test(p.name) && /thorne/i.test(p.name));
      console.log("[pupils] Joseph Thorne row:", joseph);


      const pupilIds = normalized.map((p) => p.id);
      if (pupilIds.length === 0) {
        setLessonCountMap({});
        setBalanceMap({});
        setHoursMap({});
        return;
      }

      try {
        const { data: lessonRows, error: lcErr } = await supabase
          .from("lessons")
          .select("pupil_id")
          .in("pupil_id", pupilIds)
          .in("status", ["confirmed", "completed"])
          .is("deleted_at", null);
        if (lcErr) console.error("[pupils] lesson count error", lcErr);
        const map = ((lessonRows ?? []) as { pupil_id: string }[]).reduce(
          (acc, r) => {
            acc[r.pupil_id] = (acc[r.pupil_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
        console.log("[pupils] lesson count map:", map);
        setLessonCountMap(map);
      } catch (e) {
        console.error("[pupils] lesson count crashed", e);
        setLessonCountMap({});
      }

      try {
        const { data: lessonBalances, error: lbErr } = await supabase
          .from("lessons")
          .select("pupil_id, amount_due")
          .eq("instructor_id", uid)
          .eq("payment_status", "unpaid")
          .is("deleted_at", null);
        if (lbErr) console.error("[pupils] lesson balances error", lbErr);
        const bMap = ((lessonBalances ?? []) as { pupil_id: string; amount_due: number | null }[]).reduce(
          (acc, row) => {
            if (!row.pupil_id) return acc;
            acc[row.pupil_id] = (acc[row.pupil_id] || 0) + Number(row.amount_due || 0);
            return acc;
          },
          {} as Record<string, number>,
        );
        setBalanceMap(bMap);
      } catch (e) {
        console.error("[pupils] balance fetch crashed", e);
        setBalanceMap({});
      }

      try {
        const { data: hourRows, error: hErr } = await supabase
          .from("lessons")
          .select("pupil_id, duration_minutes")
          .eq("instructor_id", uid)
          .is("deleted_at", null);
        if (hErr) console.error("[pupils] hours error", hErr);
        const hMap = ((hourRows ?? []) as { pupil_id: string; duration_minutes: number | null }[]).reduce(
          (acc, row) => {
            if (!row.pupil_id) return acc;
            acc[row.pupil_id] = (acc[row.pupil_id] || 0) + (Number(row.duration_minutes) || 0) / 60;
            return acc;
          },
          {} as Record<string, number>,
        );
      setHoursMap(hMap);
    } catch (e) {
      console.error("[pupils] hours fetch crashed", e);
      setHoursMap({});
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token && pupilIds.length > 0) {
        const pupilIdList = pupilIds.join(",");
        const SUPABASE_URL = (supabase as any).supabaseUrl;
        const SUPABASE_ANON_KEY = (supabase as any).supabaseKey;
        const histRes = await fetch(
          `${SUPABASE_URL}/rest/v1/lesson_history?pupil_id=in.(${pupilIdList})&payment_status=eq.paid&deleted_at=is.null&order=created_at.desc&select=pupil_id,lesson_cost,payment_method,created_at`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
        );
        const histData = await histRes.json();
        const map: Record<string, { amount: number; method: string; date: string }> = {};
        for (const row of histData || []) {
          if (!map[row.pupil_id]) {
            map[row.pupil_id] = {
              amount: Number(row.lesson_cost),
              method: row.payment_method,
              date: row.created_at,
            };
          }
        }
        setLastPaymentMap(map);
      }
    } catch (e) {
      console.error("[pupils] recent payments fetch crashed", e);
      setLastPaymentMap({});
    }
  })();
  }, [tab, reloadKey]);




  const filtered = useMemo(() => {
    if (!pupils) return null;
    const q = query.trim().toLowerCase();
    return pupils.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pupils, query]);

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe relative" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white" style={POPPINS}>
            DSM
          </span>
          <span className="text-[15px] text-white" style={POPPINS}>
            Pupils
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/broadcast"
            aria-label="Message all pupils"
            className="flex items-center gap-1 px-2 h-8 rounded-md"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <Megaphone size={16} color="#FFFFFF" />
            <span className="text-[12px] font-medium text-white" style={POPPINS}>Message all</span>
          </Link>
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
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 pt-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pupils..."
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
            style={{
              ...POPPINS,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
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
            borderColor: "#EEF2F7",
          }}
        >
          {(
            [
              { k: "active", label: "Active" },
              { k: "passed", label: "Passed" },
              { k: "archived", label: "Archived" },
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
                  color: active ? "#0B1F3A" : "#6B7280",
                  borderWidth: active ? "0.5px" : 0,
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="pt-2">
        {filtered === null ? (
          <div className="flex flex-col">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white flex items-stretch"
                style={{ gap: 12, padding: "12px 16px", minHeight: 64 }}
              >
                <div
                  className="skeleton-pulse rounded-full shrink-0"
                  style={{ width: 40, height: 40, backgroundColor: "#EEF2F7" }}
                />
                <div
                  className="shrink-0"
                  style={{ width: 3, borderRadius: 2, backgroundColor: "#EEF2F7" }}
                />
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-2">
                  <div
                    className="skeleton-pulse"
                    style={{ height: 14, width: "60%", backgroundColor: "#EEF2F7", borderRadius: 4 }}
                  />
                  <div
                    className="skeleton-pulse"
                    style={{ height: 12, width: "40%", backgroundColor: "#EEF2F7", borderRadius: 4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={tab === "active" ? "No active pupils" : tab === "passed" ? "No passed pupils" : "No archived pupils"}
            description={tab === "active" ? "Add your first pupil to start tracking lessons." : undefined}
            action={
              tab === "active" ? (
                <Link
                  to="/pupils/new"
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white"
                  style={{ backgroundColor: "#1877D6", fontFamily: "Inter, sans-serif" }}
                >
                  <Plus size={16} /> Add pupil
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col">
            {filtered.map((p, idx) => {
              const status: StatusKey = tab === "archived" ? "archived" : ((p.status ?? "active").toLowerCase() as StatusKey);
              const b = balanceMap[p.id] || 0;
              const credit = Number(p.account_balance) || 0;
              const balanceOwed = b - credit;
              console.log("[pupils] balance for", p.name, ":", {
                pupilId: p.id,
                balanceFromLessons: balanceMap[p.id],
                creditFromAccountBalance: p.account_balance,
                net: balanceOwed,
              });
              const lessons = lessonCountMap[p.id] || 0;
              const accent = accentColor(status);
              const prepaid = Number(p.prepaid_hours) || 0;
              const hoursUsed = hoursMap[p.id] || 0;
              const hoursRemaining = prepaid - hoursUsed;
              const isPrepaidPupil =
                prepaid > 0 ||
                Number(p.ni_amount_total) > 0 ||
                (p.lead_source ?? "").toLowerCase() === "national intensive";
              return (
                <div key={p.id}>
                  <Link
                    to="/pupils/$id"
                    params={{ id: p.id }}
                    className="block bg-white"
                  >
                    <div
                      className="flex items-stretch"
                      style={{ gap: 12, padding: "12px 16px", minHeight: 64 }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full shrink-0 text-[13px] font-semibold self-center"
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: "#1877D6",
                          color: "#FFFFFF",
                          ...POPPINS,
                        }}
                      >
                        {initials(p.name)}
                      </div>
                      <div
                        className="shrink-0"
                        style={{ width: 3, borderRadius: 2, backgroundColor: accent, alignSelf: "stretch" }}
                      />
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div
                          className="text-[14px] font-semibold text-[#0B1F3A] truncate"
                          style={POPPINS}
                        >
                          {p.name}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                        <div className="flex items-center gap-2">
                          {isPrepaidPupil ? (
                            prepaid > 0 ? (
                              hoursRemaining <= 0 ? (
                                <span
                                  className="text-[12px] font-medium"
                                  style={{ color: "#1877D6", ...POPPINS }}
                                >
                                  Hours done
                                </span>
                              ) : (
                                <span
                                  className="text-[12px] font-medium"
                                  style={{
                                    color: hoursRemaining > 5 ? "#1877D6" : "#1877D6",
                                    ...POPPINS,
                                  }}
                                >
                                  {hoursRemaining.toFixed(1)}h left
                                </span>
                              )
                            ) : (
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: "#1877D6", ...POPPINS }}
                              >
                                Prepaid ✓
                              </span>
                            )
                          ) : balanceOwed > 0 ? (
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: "#1877D6", ...POPPINS }}
                            >
                              £{balanceOwed.toFixed(2)} owed
                            </span>
                          ) : balanceOwed < 0 ? (
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: "#16A34A", ...POPPINS }}
                            >
                              In credit £{Math.abs(balanceOwed).toFixed(2)}
                            </span>
                          ) : lessons > 0 ? (
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: "#1877D6", ...POPPINS }}
                            >
                              All paid ✓
                            </span>
                          ) : null}
                        </div>
                        {lastPaymentMap[p.id] && (
                          <div className="flex items-center gap-1">
                            <CreditCard size={10} color="#6B7280" />
                            <span className="text-xs text-[#6B7280]" style={POPPINS}>
                              Last payment: £{lastPaymentMap[p.id].amount.toFixed(2)} ({lastPaymentMap[p.id].method}) {formatRelativeDate(lastPaymentMap[p.id].date)}
                            </span>
                          </div>
                        )}
                        {prepaid > 0 && Number(p.ni_amount_total) > 0 && (() => {
                          const niOwed = Number(p.ni_amount_total ?? 0) - Number(p.ni_amount_paid ?? 0);
                          if (niOwed <= 0) return null;
                          return (
                            <span
                              className="text-[11px] font-medium"
                              style={{ color: "#1877D6", ...POPPINS }}
                            >
                              £{niOwed.toFixed(2)} NI owed
                            </span>
                          );
                        })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className="text-[12px] text-[#6B7280]"
                          style={POPPINS}
                        >
                          {lessons} {lessons === 1 ? "lesson" : "lessons"}
                        </span>
                        <ChevronRight size={14} color="#9CA3AF" />
                      </div>
                    </div>
                  </Link>
                  {idx < filtered.length - 1 && (
                    <div style={{ height: 0.5, backgroundColor: "#F3F4F6", marginLeft: 68 }} />
                  )}
                </div>
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
          backgroundColor: "#1877D6",
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
