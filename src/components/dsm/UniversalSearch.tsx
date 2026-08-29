import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconBriefcase,
  IconCalendar,
  IconCalendarStats,
  IconChevronRight,
  IconCurrencyPound,
  IconInbox,
  IconMessage,
  IconSchool,
  IconSearch,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "../../lib/supabaseClient";

/** Opens the universal search sheet from anywhere in the app. */
export function openUniversalSearch() {
  window.dispatchEvent(new CustomEvent("dsm-open-universal-search"));
}

const RECENTS_KEY = "dsm-universal-search-recents";

type ResultRow = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; color: string; bg: string };
  onSelect: () => void;
  avatar?: string;
};

type Category = {
  key: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  rows: ResultRow[];
};

const C = {
  navy: "#0B2341",
  sub: "#536579",
  blue: "#2C97DE",
  field: "#F4F6F8",
  chev: "#D1D5DB",
};

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function UniversalSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [mounted, setMounted] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  // Slide-up animation + autofocus
  useEffect(() => {
    if (!isOpen) {
      setMounted(false);
      setQuery("");
      setDebounced("");
      setCats([]);
      return;
    }
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      setRecents(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setRecents([]);
    }
    const t = window.setTimeout(() => setMounted(true), 10);
    const f = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(f);
    };
  }, [isOpen]);

  // Debounce 300ms
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const rememberQuery = useCallback((q: string) => {
    if (!q.trim()) return;
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      const prev: string[] = raw ? JSON.parse(raw) : [];
      const next = [q.trim(), ...prev.filter((p) => p !== q.trim())].slice(0, 5);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      setRecents(next);
    } catch {
      /* ignore */
    }
  }, []);

  const go = useCallback(
    (fn: () => void) => {
      rememberQuery(debounced);
      onClose();
      fn();
    },
    [debounced, onClose, rememberQuery],
  );

  useEffect(() => {
    if (!isOpen) return;
    const q = debounced;
    if (q.length < 2) {
      setCats([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) {
        if (!cancelled) {
          setCats([]);
          setLoading(false);
        }
        return;
      }
      const like = `%${q}%`;

      const [
        pupilsRes,
        lessonsRes,
        paymentsRes,
        testsRes,
        enquiriesRes,
        messagesRes,
        coursesRes,
        jobsRes,
      ] = await Promise.all([
        supabase
          .from("pupils")
          .select("id, name, phone, email")
          .eq("instructor_id", uid)
          .is("deleted_at", null)
          .ilike("name", like)
          .limit(3),
        supabase
          .from("lessons")
          .select("id, lesson_date, lesson_time, pickup_location, pupil:pupils(name)")
          .eq("instructor_id", uid)
          .is("deleted_at", null)
          .ilike("pupils.name", like)
          .order("lesson_date", { ascending: false })
          .limit(3),
        supabase
          .from("lesson_history")
          .select("id, lesson_cost, created_at, payment_status, pupils(name)")
          .eq("instructor_id", uid)
          .ilike("pupils.name", like)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("lessons")
          .select("id, lesson_date, lesson_time, pickup_location, pupil:pupils(name)")
          .eq("instructor_id", uid)
          .eq("lesson_type", "test")
          .is("deleted_at", null)
          .ilike("pupils.name", like)
          .order("lesson_date", { ascending: false })
          .limit(3),
        supabase
          .from("enquiries")
          .select("id, name, message, created_at")
          .eq("instructor_id", uid)
          .ilike("name", like)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("instructor_messages")
          .select("id, body, created_at, conversation_id")
          .or(`from_instructor_id.eq.${uid},to_instructor_id.eq.${uid}`)
          .ilike("body", like)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("instructor_courses")
          .select("id, name, price, max_spaces, spaces_taken")
          .eq("instructor_id", uid)
          .ilike("name", like)
          .limit(3),
        supabase
          .from("job_offers")
          .select("id, pupil_name, postcode_area, created_at")
          .ilike("pupil_name", like)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      if (cancelled) return;

      const next: Category[] = [];

      const pupils = (pupilsRes.data as any[] | null) ?? [];
      if (pupils.length) {
        next.push({
          key: "pupils",
          label: "Pupils",
          icon: <IconUsers size={13} color={C.blue} stroke={1.8} />,
          iconBg: "#2C97DE",
          iconColor: "#FFFFFF",
          rows: pupils.map((p) => ({
            id: p.id,
            title: p.name ?? "Pupil",
            subtitle: p.phone ?? p.email ?? "",
            avatar: initials(p.name),
            onSelect: () => go(() => navigate({ to: "/pupils/$id", params: { id: p.id } as any })),
          })),
        });
      }

      const lessons = ((lessonsRes.data as any[] | null) ?? []).filter((l) => l.pupil);
      if (lessons.length) {
        next.push({
          key: "lessons",
          label: "Lessons",
          icon: <IconCalendar size={13} color={C.blue} stroke={1.8} />,
          iconBg: "#EAF5FC",
          iconColor: "#2C97DE",
          rows: lessons.map((l) => ({
            id: l.id,
            title: l.pupil?.name ?? "Lesson",
            subtitle: `${fmtDate(l.lesson_date)}${l.lesson_time ? ` · ${String(l.lesson_time).slice(0, 5)}` : ""}`,
            onSelect: () => go(() => navigate({ to: "/schedule" as any })),
          })),
        });
      }

      const payments = ((paymentsRes.data as any[] | null) ?? []).filter((p) => p.pupils);
      if (payments.length) {
        next.push({
          key: "payments",
          label: "Payments",
          icon: <IconCurrencyPound size={13} color="#16A34A" stroke={1.8} />,
          iconBg: "#DCFCE7",
          iconColor: "#16A34A",
          rows: payments.map((p) => {
            const paid = String(p.payment_status ?? "").toLowerCase() === "paid";
            return {
              id: p.id,
              title: `£${Number(p.lesson_cost ?? 0).toFixed(2)} · ${p.pupils?.name ?? ""}`,
              subtitle: fmtDate(p.created_at),
              badge: paid
                ? { label: "PAID", color: "#16A34A", bg: "#DCFCE7" }
                : { label: "UNPAID", color: "#E53935", bg: "#FEE2E2" },
              onSelect: () => go(() => navigate({ to: "/payments" as any })),
            };
          }),
        });
      }

      const tests = ((testsRes.data as any[] | null) ?? []).filter((t) => t.pupil);
      if (tests.length) {
        next.push({
          key: "tests",
          label: "Tests",
          icon: <IconCalendarStats size={13} color="#F59E0B" stroke={1.8} />,
          iconBg: "#FEF3C7",
          iconColor: "#F59E0B",
          rows: tests.map((t) => ({
            id: t.id,
            title: t.pupil?.name ?? "Test",
            subtitle: `${fmtDate(t.lesson_date)}${t.pickup_location ? ` · ${t.pickup_location}` : ""}`,
            onSelect: () => go(() => navigate({ to: "/schedule" as any })),
          })),
        });
      }

      const enquiries = (enquiriesRes.data as any[] | null) ?? [];
      if (enquiries.length) {
        next.push({
          key: "enquiries",
          label: "Enquiries",
          icon: <IconInbox size={13} color="#7B61FF" stroke={1.8} />,
          iconBg: "#EDE9FE",
          iconColor: "#7B61FF",
          rows: enquiries.map((e) => ({
            id: e.id,
            title: e.name ?? "Enquiry",
            subtitle: `${(e.message ?? "").slice(0, 48)}${(e.message ?? "").length > 48 ? "…" : ""} · ${fmtDate(e.created_at)}`,
            onSelect: () => go(() => navigate({ to: "/enquiries" as any })),
          })),
        });
      }

      const messages = (messagesRes.data as any[] | null) ?? [];
      if (messages.length) {
        next.push({
          key: "messages",
          label: "Messages",
          icon: <IconMessage size={13} color={C.blue} stroke={1.8} />,
          iconBg: "#EAF5FC",
          iconColor: "#2C97DE",
          rows: messages.map((m) => ({
            id: m.id,
            title: `${(m.body ?? "").slice(0, 40)}${(m.body ?? "").length > 40 ? "…" : ""}`,
            subtitle: fmtDate(m.created_at),
            onSelect: () => go(() => navigate({ to: "/messages" as any })),
          })),
        });
      }

      const courses = (coursesRes.data as any[] | null) ?? [];
      if (courses.length) {
        next.push({
          key: "courses",
          label: "Courses",
          icon: <IconSchool size={13} color="#E53935" stroke={1.8} />,
          iconBg: "#FEE2E2",
          iconColor: "#E53935",
          rows: courses.map((c) => ({
            id: c.id,
            title: c.name ?? "Course",
            subtitle: `£${Number(c.price ?? 0)} · ${Math.max(0, Number(c.max_spaces ?? 0) - Number(c.spaces_taken ?? 0))} spaces left`,
            onSelect: () => go(() => navigate({ to: "/courses" as any })),
          })),
        });
      }

      const jobs = (jobsRes.data as any[] | null) ?? [];
      if (jobs.length) {
        next.push({
          key: "jobs",
          label: "Jobs",
          icon: <IconBriefcase size={13} color="#F59E0B" stroke={1.8} />,
          iconBg: "#FEF3C7",
          iconColor: "#F59E0B",
          rows: jobs.map((j) => ({
            id: j.id,
            title: j.pupil_name ?? "Job offer",
            subtitle: `${j.postcode_area ?? ""}${j.postcode_area ? " · " : ""}${fmtDate(j.created_at)}`,
            onSelect: () => go(() => navigate({ to: "/jobs" as any })),
          })),
        });
      }

      setCats(next);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setCats([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debounced, isOpen, go, navigate]);

  const hasResults = useMemo(() => cats.some((c) => c.rows.length > 0), [cats]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(0,0,0,0.5)",
        opacity: mounted ? 1 : 0,
        transition: "opacity 200ms ease",
        display: "flex",
        alignItems: "flex-end",
        fontFamily: "Poppins, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: "transform 260ms cubic-bezier(0.22,1,0.36,1)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: "#D1D5DB" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 12px" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: C.field,
              border: `1.5px solid ${focused ? C.blue : "transparent"}`,
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <IconSearch size={18} color={C.blue} stroke={1.8} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search pupils, lessons, payments..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: C.navy,
                fontFamily: "Poppins, sans-serif",
              }}
            />
            {query.length > 0 && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                style={{ border: "none", background: "transparent", padding: 0, display: "flex", cursor: "pointer" }}
              >
                <IconX size={16} color={C.sub} />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            style={{ border: "none", background: "transparent", padding: 4, display: "flex", cursor: "pointer" }}
          >
            <IconX stroke={1.5} size={20} color="#536579" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "0 16px 8px" }}>
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  border: `2px solid ${C.field}`,
                  borderTopColor: C.blue,
                  borderRadius: "50%",
                  animation: "dsm-us-spin 700ms linear infinite",
                }}
              />
              <style>{"@keyframes dsm-us-spin{to{transform:rotate(360deg)}}"}</style>
            </div>
          )}

          {!loading && debounced.length < 2 && (
            <div style={{ padding: "4px 0 20px" }}>
              {recents.length > 0 ? (
                <>
                  <div style={headerStyle}>Recent searches</div>
                  <div style={groupStyle}>
                    {recents.map((r, i) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setQuery(r)}
                        style={{ ...rowStyle, borderBottom: i === recents.length - 1 ? "none" : "1px solid #E7EBEF" }}
                      >
                        <div style={{ ...iconSquare, background: "#EAF5FC" }}>
                          <IconSearch size={16} color={C.blue} />
                        </div>
                        <div style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 600, color: C.navy }}>{r}</div>
                        <IconChevronRight size={16} color={C.chev} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "24px 0" }}>
                  Start typing to search your pupils, lessons, payments and more.
                </div>
              )}
            </div>
          )}

          {!loading && debounced.length >= 2 && !hasResults && (
            <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "28px 0" }}>No results found</div>
          )}

          {!loading &&
            cats.map((cat) => (
              <div key={cat.key} style={{ marginBottom: 16 }}>
                <div style={headerStyle}>
                  <span style={{ display: "inline-flex", marginRight: 6, verticalAlign: "-2px" }}>{cat.icon}</span>
                  {cat.label}
                </div>
                <div style={groupStyle}>
                  {cat.rows.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={r.onSelect}
                      style={{ ...rowStyle, borderBottom: i === cat.rows.length - 1 ? "none" : "1px solid #E7EBEF" }}
                    >
                      <div
                        style={{
                          ...iconSquare,
                          background: cat.iconBg,
                          color: cat.iconColor,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {r.avatar ? r.avatar : cat.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: C.navy,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.title}
                        </div>
                        {r.subtitle ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: C.sub,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.subtitle}
                          </div>
                        ) : null}
                      </div>
                      {r.badge ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: r.badge.color,
                            background: r.badge.bg,
                            borderRadius: 999,
                            padding: "3px 8px",
                            marginRight: 6,
                          }}
                        >
                          {r.badge.label}
                        </span>
                      ) : null}
                      <IconChevronRight size={16} color={C.chev} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: C.sub,
  margin: "4px 2px 8px",
};

const groupStyle: React.CSSProperties = {
  background: C.field,
  borderRadius: 12,
  overflow: "hidden",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

const iconSquare: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  color: "#FFFFFF",
};
