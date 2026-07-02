import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search as SearchIcon, Clock } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — DSM" },
      { name: "description", content: "Search pupils, lessons, payments, notes and enquiries." },
    ],
  }),
  component: SearchPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const RECENTS_KEY = "dsm:recentScreens";

type PupilHit = { id: string; name: string; status: string | null };
type LessonHit = { id: string; lesson_date: string; lesson_time: string; pupilName: string };
type PaymentHit = { id: string; amount: number; paid_at: string; pupilName: string };
type NoteHit = { id: string; title: string | null; body: string | null };
type EnquiryHit = { id: string; name: string | null; status: string | null };

type Results = {
  pupils: PupilHit[];
  lessons: LessonHit[];
  payments: PaymentHit[];
  notes: NoteHit[];
  enquiries: EnquiryHit[];
};

type RecentScreen = { label: string; route: string; at: number };

const SCREEN_LABELS: Record<string, string> = {
  "/home": "Home",
  "/pupils": "Pupils",
  "/schedule": "Schedule",
  "/payments": "Payments",
  "/notes": "Notes",
  "/enquiries": "Enquiries",
  "/messages": "Messages",
  "/settings": "Settings",
  "/expenses": "Expenses",
  "/mileage": "Mileage",
  "/earnings": "Earnings",
  "/reports": "Reports",
  "/subscription": "My plan",
};

function readRecents(): RecentScreen[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function escapeLike(q: string) {
  return q.replace(/[%,]/g, " ").trim();
}

function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return d;
  }
}

function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents] = useState<RecentScreen[]>(() => readRecents());
  const reqRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(h);
  }, [query]);

  useEffect(() => {
    if (!userId) return;
    const q = escapeLike(debounced);
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myReq = ++reqRef.current;
    const pattern = `%${q}%`;

    (async () => {
      const pupilsP = supabase
        .from("pupils")
        .select("id, name, first_name, last_name, phone, email, status")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .or(
          `name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`,
        )
        .limit(10);

      const notesP = supabase
        .from("notes")
        .select("id, title, body")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .or(`title.ilike.${pattern},body.ilike.${pattern}`)
        .limit(4);

      const enquiriesP = supabase
        .from("enquiries")
        .select("id, name, phone, status")
        .eq("instructor_id", userId)
        .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
        .limit(4);

      // Lessons + payments search via pupil name → pupil_ids, then fetch rows.
      const pupilIdsRes = await supabase
        .from("pupils")
        .select("id, name, first_name, last_name")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .or(
          `name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
        )
        .limit(20);
      const pupilMap = new Map<string, string>();
      (pupilIdsRes.data ?? []).forEach((p: any) => {
        const nm =
          (p.name && String(p.name).trim()) ||
          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
          "Unnamed";
        pupilMap.set(p.id, nm);
      });
      const pupilIds = Array.from(pupilMap.keys());

      const lessonsP = pupilIds.length
        ? supabase
            .from("lessons")
            .select("id, lesson_date, lesson_time, pupil_id")
            .eq("instructor_id", userId)
            .is("deleted_at", null)
            .in("pupil_id", pupilIds)
            .order("lesson_date", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: [], error: null } as any);

      const paymentsP = pupilIds.length
        ? supabase
            .from("payments")
            .select("id, amount, paid_at, pupil_id")
            .eq("instructor_id", userId)
            .is("deleted_at", null)
            .in("pupil_id", pupilIds)
            .order("paid_at", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: [], error: null } as any);

      const [pupilsR, notesR, enquiriesR, lessonsR, paymentsR] = await Promise.all([
        pupilsP,
        notesP,
        enquiriesP,
        lessonsP,
        paymentsP,
      ]);

      if (myReq !== reqRef.current) return;

      if (pupilsR.error) console.error("[search] pupils", pupilsR.error);
      if (notesR.error) console.error("[search] notes", notesR.error);
      if (enquiriesR.error) console.error("[search] enquiries", enquiriesR.error);
      if ((lessonsR as any).error) console.error("[search] lessons", (lessonsR as any).error);
      if ((paymentsR as any).error) console.error("[search] payments", (paymentsR as any).error);

      const pupilHits: PupilHit[] = (pupilsR.data ?? []).map((p: any) => ({
        id: p.id,
        name:
          (p.name && String(p.name).trim()) ||
          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
          "Unnamed",
        status: p.status ?? null,
      }));

      const lessonHits: LessonHit[] = ((lessonsR as any).data ?? []).map((l: any) => ({
        id: l.id,
        lesson_date: l.lesson_date,
        lesson_time: l.lesson_time,
        pupilName: pupilMap.get(l.pupil_id) ?? "Pupil",
      }));

      const paymentHits: PaymentHit[] = ((paymentsR as any).data ?? []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount ?? 0),
        paid_at: p.paid_at,
        pupilName: pupilMap.get(p.pupil_id) ?? "Pupil",
      }));

      const noteHits: NoteHit[] = (notesR.data ?? []).map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
      }));

      const enquiryHits: EnquiryHit[] = (enquiriesR.data ?? []).map((e: any) => ({
        id: e.id,
        name: e.name,
        status: e.status,
      }));

      setResults({
        pupils: pupilHits,
        lessons: lessonHits,
        payments: paymentHits,
        notes: noteHits,
        enquiries: enquiryHits,
      });
      setLoading(false);
    })();
  }, [debounced, userId]);

  const totalCount = useMemo(() => {
    if (!results) return 0;
    return (
      results.pupils.length +
      results.lessons.length +
      results.payments.length +
      results.notes.length +
      results.enquiries.length
    );
  }, [results]);

  function go(route: string) {
    navigate({ to: route });
  }

  return (
    <div className="min-h-screen" style={{ ...POPPINS, backgroundColor: "#F3F8FF" }}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 flex items-center px-3"
        style={{ height: 56, backgroundColor: "#072b47", gap: 10 }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 32, height: 32 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 flex items-center"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            height: 38,
            paddingLeft: 10,
            paddingRight: 10,
            gap: 8,
          }}
        >
          <SearchIcon size={16} color="#6B7280" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            className="flex-1 bg-transparent outline-none text-[14px] text-[#0B1F3A]"
            style={POPPINS}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[12px] text-[#6B7280]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        {!debounced && (
          <>
            <SectionHeader>RECENT</SectionHeader>
            {recents.length === 0 ? (
              <div className="text-[13px] text-[#6B7280]" style={{ padding: "16px 0" }}>
                Visit a few screens and they'll show up here.
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 8 }}>
                {recents.map((r) => (
                  <Row key={r.route} onClick={() => go(r.route)} icon={<Clock size={16} color="#6B7280" />}>
                    <div className="text-[14px] text-[#0B1F3A]">{r.label}</div>
                    <div className="text-[12px] text-[#6B7280]">{r.route}</div>
                  </Row>
                ))}
              </div>
            )}
          </>
        )}

        {debounced && loading && (
          <div className="text-[13px] text-[#6B7280]" style={{ padding: "20px 0" }}>
            Searching…
          </div>
        )}

        {debounced && !loading && results && totalCount === 0 && (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: "48px 0", color: "#6B7280" }}
          >
            <SearchIcon size={28} color="#9CA3AF" />
            <div className="text-[13px] mt-2">No results for “{debounced}”</div>
          </div>
        )}

        {debounced && !loading && results && totalCount > 0 && (
          <>
            {results.pupils.length > 0 && (
              <ResultGroup
                title="PUPILS"
                total={results.pupils.length}
                onSeeAll={() => go("/pupils")}
              >
                {results.pupils.slice(0, 3).map((p) => (
                  <Row
                    key={p.id}
                    onClick={() => go("/pupils")}
                    icon={<Avatar name={p.name} />}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[14px] text-[#0B1F3A]">{p.name}</div>
                      {p.status && <StatusBadge status={p.status} />}
                    </div>
                  </Row>
                ))}
              </ResultGroup>
            )}

            {results.lessons.length > 0 && (
              <ResultGroup
                title="LESSONS"
                total={results.lessons.length}
                onSeeAll={() => go("/schedule")}
              >
                {results.lessons.slice(0, 3).map((l) => (
                  <Row key={l.id} onClick={() => go("/schedule")}>
                    <div className="text-[14px] text-[#0B1F3A]">
                      {formatTime(l.lesson_time)} · {l.pupilName}
                    </div>
                    <div className="text-[12px] text-[#6B7280]">{formatDate(l.lesson_date)}</div>
                  </Row>
                ))}
              </ResultGroup>
            )}

            {results.payments.length > 0 && (
              <ResultGroup
                title="PAYMENTS"
                total={results.payments.length}
                onSeeAll={() => go("/payments")}
              >
                {results.payments.slice(0, 3).map((p) => (
                  <Row key={p.id} onClick={() => go("/payments")}>
                    <div className="flex items-center justify-between">
                      <div className="text-[14px] text-[#0B1F3A]">{p.pupilName}</div>
                      <div className="text-[14px] font-semibold text-[#0B1F3A]">
                        £{p.amount.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-[12px] text-[#6B7280]">{formatDate(p.paid_at)}</div>
                  </Row>
                ))}
              </ResultGroup>
            )}

            {results.notes.length > 0 && (
              <ResultGroup
                title="NOTES"
                total={results.notes.length}
                onSeeAll={() => go("/notes")}
              >
                {results.notes.slice(0, 3).map((n) => (
                  <Row
                    key={n.id}
                    onClick={() => navigate({ to: "/notes/$id", params: { id: n.id } })}
                  >
                    <div className="text-[14px] text-[#0B1F3A]">
                      {n.title?.trim() || "Untitled"}
                    </div>
                    {n.body && (
                      <div
                        className="text-[12px] text-[#6B7280]"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {n.body.slice(0, 80)}
                      </div>
                    )}
                  </Row>
                ))}
              </ResultGroup>
            )}

            {results.enquiries.length > 0 && (
              <ResultGroup
                title="ENQUIRIES"
                total={results.enquiries.length}
                onSeeAll={() => go("/enquiries")}
              >
                {results.enquiries.slice(0, 3).map((e) => (
                  <Row key={e.id} onClick={() => go("/enquiries")}>
                    <div className="flex items-center justify-between">
                      <div className="text-[14px] text-[#0B1F3A]">{e.name ?? "Unnamed"}</div>
                      {e.status && <StatusBadge status={e.status} />}
                    </div>
                  </Row>
                ))}
              </ResultGroup>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  total,
  onSeeAll,
  children,
}: {
  title: string;
  total: number;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeader>{title}</SectionHeader>
        {total > 3 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-[12px] font-medium"
            style={{ color: "#1877D6", ...POPPINS }}
          >
            See all {total}
          </button>
        )}
      </div>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  onClick,
  children,
  icon,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white text-left flex items-center"
      style={{
        padding: 12,
        borderRadius: 10,
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        gap: 12,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {icon && <div style={{ flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="flex items-center justify-center rounded-full text-white text-[12px] font-semibold"
      style={{ width: 32, height: 32, backgroundColor: "#1877D6" }}
    >
      {initial}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const color =
    s === "active" || s === "confirmed" || s === "converted"
      ? "#16A34A"
      : s === "pending" || s === "new"
        ? "#F59E0B"
        : s === "cancelled" || s === "lost"
          ? "#CC2229"
          : "#6B7280";
  return (
    <span
      className="text-[10px] uppercase font-medium"
      style={{
        color,
        backgroundColor: `${color}14`,
        padding: "3px 8px",
        borderRadius: 999,
        letterSpacing: "0.05em",
      }}
    >
      {status}
    </span>
  );
}

// Exported helper so callers can record screens for the Recent list.
export function recordRecentScreen(route: string, label?: string) {
  if (typeof window === "undefined") return;
  if (route === "/search") return;
  try {
    const existing = readRecents();
    const next: RecentScreen[] = [
      { route, label: label ?? SCREEN_LABELS[route] ?? route, at: Date.now() },
      ...existing.filter((r) => r.route !== route),
    ].slice(0, 5);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
