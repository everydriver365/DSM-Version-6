import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, PoundSterling,
  GraduationCap, Inbox, FileText, Award, CheckSquare, UserX, Phone, Square,
} from "lucide-react";
import { Card } from "../components/dsm/Card";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/outstanding")({
  head: () => ({
    meta: [
      { title: "Outstanding tasks — DSM by EveryDriver" },
      { name: "description", content: "Everything that needs your attention, in one place." },
    ],
  }),
  component: OutstandingPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface PupilDebt { id: string; name: string; phone: string | null; balance_owed: number }
interface TestRow { id: string; test_date: string; test_centre: string | null; pupil_name: string | null }
interface EnquiryRow { id: string; name: string; phone: string | null; course_interest: string | null; created_at: string }
interface DocRow { id: string; name: string; expiry_date: string }
interface CertRow { id: string; name: string; expiry_date: string }
interface TodoRow { id: string; title: string; due_date: string }
interface StalePupil { id: string; name: string; last_date: string | null }

function ymd(d: Date) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86400000);
}

function OutstandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [debts, setDebts] = useState<PupilDebt[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [stale, setStale] = useState<StalePupil[]>([]);

  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setLoading(false); return; }

      const today = new Date();
      const todayYmd = ymd(today);
      const in7 = ymd(new Date(today.getTime() + 7 * 86400000));
      const in30 = ymd(new Date(today.getTime() + 30 * 86400000));
      const in60 = ymd(new Date(today.getTime() + 60 * 86400000));
      const ago48h = new Date(today.getTime() - 48 * 3600000).toISOString();
      const ago30d = ymd(new Date(today.getTime() - 30 * 86400000));

      const [debtRes, testRes, enqRes, docRes, certRes, todoRes, pupilRes] = await Promise.all([
        supabase.from("pupils")
          .select("id, name, phone, balance_owed")
          .eq("instructor_id", uid).is("deleted_at", null)
          .gt("balance_owed", 0).order("balance_owed", { ascending: false }),
        supabase.from("driving_tests")
          .select("id, test_date, test_centre, pupils(name)")
          .eq("instructor_id", uid)
          .gte("test_date", todayYmd).lte("test_date", in7)
          .order("test_date", { ascending: true }),
        supabase.from("enquiries")
          .select("id, name, phone, course_interest, created_at")
          .eq("instructor_id", uid).eq("status", "new")
          .lt("created_at", ago48h).order("created_at", { ascending: true }),
        supabase.from("documents")
          .select("id, name, expiry_date")
          .eq("instructor_id", uid).is("deleted_at", null)
          .gte("expiry_date", todayYmd).lte("expiry_date", in30)
          .order("expiry_date", { ascending: true }),
        supabase.from("certifications")
          .select("id, name, expiry_date")
          .eq("instructor_id", uid)
          .gte("expiry_date", todayYmd).lte("expiry_date", in60)
          .order("expiry_date", { ascending: true }),
        supabase.from("todos")
          .select("id, title, due_date")
          .eq("instructor_id", uid).eq("completed", false)
          .lt("due_date", todayYmd).order("due_date", { ascending: true }),
        supabase.from("pupils")
          .select("id, name").eq("instructor_id", uid).is("deleted_at", null),
      ]);

      if (debtRes.error) console.error("[outstanding] debts", debtRes.error);
      if (testRes.error) console.error("[outstanding] tests", testRes.error);
      if (enqRes.error) console.error("[outstanding] enquiries", enqRes.error);
      if (docRes.error) console.error("[outstanding] docs", docRes.error);
      if (certRes.error) console.error("[outstanding] certs", certRes.error);
      if (todoRes.error) console.error("[outstanding] todos", todoRes.error);

      setDebts((debtRes.data ?? []) as PupilDebt[]);
      setTests(((testRes.data ?? []) as unknown as Array<{ id: string; test_date: string; test_centre: string | null; pupils: { name: string } | { name: string }[] | null }>).map((t) => {
        const p = Array.isArray(t.pupils) ? t.pupils[0] : t.pupils;
        return { id: t.id, test_date: t.test_date, test_centre: t.test_centre, pupil_name: p?.name ?? null };
      }));
      setEnquiries((enqRes.data ?? []) as EnquiryRow[]);
      setDocs((docRes.data ?? []) as DocRow[]);
      setCerts((certRes.data ?? []) as CertRow[]);
      setTodos((todoRes.data ?? []) as TodoRow[]);

      // Stale pupils: fetch latest lesson date per pupil
      const pupils = (pupilRes.data ?? []) as { id: string; name: string }[];
      if (pupils.length > 0) {
        const { data: lessonRows } = await supabase
          .from("lessons")
          .select("pupil_id, lesson_date")
          .eq("instructor_id", uid).is("deleted_at", null)
          .in("pupil_id", pupils.map((p) => p.id))
          .order("lesson_date", { ascending: false });
        const latest = new Map<string, string>();
        (lessonRows ?? []).forEach((l) => {
          if (!latest.has(l.pupil_id as string)) latest.set(l.pupil_id as string, l.lesson_date as string);
        });
        const staleList: StalePupil[] = pupils
          .map((p) => ({ id: p.id, name: p.name, last_date: latest.get(p.id) ?? null }))
          .filter((p) => !p.last_date || p.last_date < ago30d);
        setStale(staleList);
      }

      setLoading(false);
    })();
  }, []);

  const sections = useMemo(() => [
    { key: "payments", label: "Payments", icon: <PoundSterling size={18} color="#0B1F3A" />, tint: "#EEF2F7", count: debts.length },
    { key: "tests", label: "Upcoming tests (7d)", icon: <GraduationCap size={18} color="#1E40AF" />, tint: "#DBEAFE", count: tests.length },
    { key: "enquiries", label: "Enquiries to follow up", icon: <Inbox size={18} color="#5B21B6" />, tint: "#EDE9FE", count: enquiries.length },
    { key: "docs", label: "Expiring documents (30d)", icon: <FileText size={18} color="#1877D6" />, tint: "#FEF2F2", count: docs.length },
    { key: "certs", label: "Expiring certifications (60d)", icon: <Award size={18} color="#1877D6" />, tint: "#FEF2F2", count: certs.length },
    { key: "todos", label: "Overdue todos", icon: <CheckSquare size={18} color="#0B1F3A" />, tint: "#EEF2F7", count: todos.length },
    { key: "stale", label: "Pupils with no recent lesson (30d)", icon: <UserX size={18} color="#5B21B6" />, tint: "#EDE9FE", count: stale.length },
  ], [debts, tests, enquiries, docs, certs, todos, stale]);

  const total = sections.reduce((s, x) => s + x.count, 0);

  useEffect(() => {
    // Default-open any non-empty section once on load
    if (loading) return;
    setOpen((prev) => {
      const next = { ...prev };
      sections.forEach((s) => { if (next[s.key] === undefined) next[s.key] = s.count > 0; });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  async function completeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("todos").update({ completed: true }).eq("id", id);
    if (error) console.error("[outstanding] complete todo", error);
  }

  function chase(p: PupilDebt) {
    if (!p.phone) return;
    const body = `Hi ${p.name}, just a quick reminder about your outstanding balance of £${Number(p.balance_owed).toFixed(0)}. Thanks!`;
    window.location.href = `sms:${p.phone}?body=${encodeURIComponent(body)}`;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3F8FF", ...POPPINS, paddingBottom: 32 }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10, backgroundColor: "#0B1F3A",
        padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate({ to: "/home" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Outstanding tasks</h1>
          {!loading && total > 0 && (
            <span style={{
              background: "#1877D6", color: "#fff", fontSize: 11, fontWeight: 700,
              padding: "2px 7px", borderRadius: 10, minWidth: 22, textAlign: "center",
            }}>{total}</span>
          )}
        </div>
        <div style={{ width: 24 }} />
      </div>

      <div style={{ padding: "16px" }}>
        {loading ? (
          <div style={{ color: "#6B7280", padding: 16, textAlign: "center" }}>Loading…</div>
        ) : total === 0 ? (
          <div style={{
            textAlign: "center", padding: "64px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          }}>
            <CheckCircle2 size={64} color="#1877D6" />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>
              All clear! Nothing needs attention
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", maxWidth: 280 }}>
              Payments, tests, enquiries, documents, certifications, todos and pupils all up to date.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sections.filter((s) => s.count > 0).map((s) => {
              const isOpen = open[s.key] ?? true;
              return (
                <Card key={s.key} style={{ padding: 0, overflow: "hidden" }}>
                  <button
                    onClick={() => toggle(s.key)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", background: "#fff", border: "none",
                      cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: s.tint,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ flex: 1, fontSize: 14, color: "#0B1F3A", fontWeight: 600 }}>
                      {s.label}
                    </div>
                    <span style={{
                      minWidth: 24, height: 22, padding: "0 8px", borderRadius: 11,
                      background: "#1877D6", color: "#fff",
                      fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {s.count}
                    </span>
                    {isOpen ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: "0.5px solid #EEF2F7" }}>
                      {s.key === "payments" && debts.map((p, i) => (
                        <Row key={p.id} top={i > 0}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={rowTitle}>{p.name}</div>
                            <div style={{ ...rowSub, color: "#1877D6", fontWeight: 700 }}>
                              £{Number(p.balance_owed).toFixed(2)} owed
                            </div>
                          </div>
                          <ActionBtn onClick={() => chase(p)} disabled={!p.phone}>Chase</ActionBtn>
                          <ActionBtn onClick={() => navigate({ to: "/payments" })} variant="primary">Mark paid</ActionBtn>
                        </Row>
                      ))}

                      {s.key === "tests" && tests.map((t, i) => (
                        <Row key={t.id} top={i > 0}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={rowTitle}>{t.pupil_name ?? "Pupil"}</div>
                            <div style={rowSub}>
                              {formatDate(t.test_date)}{t.test_centre ? ` · ${t.test_centre}` : ""}
                            </div>
                          </div>
                          <ActionBtn onClick={() => navigate({ to: "/tests" })} variant="primary">View</ActionBtn>
                        </Row>
                      ))}

                      {s.key === "enquiries" && enquiries.map((e, i) => (
                        <Row key={e.id} top={i > 0}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={rowTitle}>{e.name}</div>
                            <div style={rowSub}>
                              {e.course_interest ?? "—"}{e.phone ? ` · ${e.phone}` : ""}
                            </div>
                          </div>
                          {e.phone && (
                            <a href={`tel:${e.phone}`} style={{
                              ...actionBase, background: "#1877D6", color: "#fff",
                              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                              <Phone size={12} /> Call
                            </a>
                          )}
                          <ActionBtn onClick={() => navigate({ to: "/enquiries" })}>Update</ActionBtn>
                        </Row>
                      ))}

                      {s.key === "docs" && docs.map((d, i) => (
                        <Row key={d.id} top={i > 0}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={rowTitle}>{d.name}</div>
                            <div style={{ ...rowSub, color: "#1877D6", fontWeight: 600 }}>
                              Expires {formatDate(d.expiry_date)}
                            </div>
                          </div>
                          <ActionBtn onClick={() => navigate({ to: "/documents" })} variant="primary">Update</ActionBtn>
                        </Row>
                      ))}

                      {s.key === "certs" && certs.map((c, i) => (
                        <Row key={c.id} top={i > 0}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={rowTitle}>{c.name}</div>
                            <div style={{ ...rowSub, color: "#1877D6", fontWeight: 600 }}>
                              Expires {formatDate(c.expiry_date)}
                            </div>
                          </div>
                          <ActionBtn onClick={() => navigate({ to: "/certifications" })} variant="primary">Update</ActionBtn>
                        </Row>
                      ))}

                      {s.key === "todos" && todos.map((t, i) => {
                        const overdue = Math.max(1, daysBetween(ymd(new Date()), t.due_date));
                        return (
                          <Row key={t.id} top={i > 0}>
                            <button
                              onClick={() => completeTodo(t.id)}
                              aria-label="Complete"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "#1877D6", display: "flex", padding: 0,
                              }}
                            >
                              <Square size={20} />
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={rowTitle}>{t.title}</div>
                              <div style={{ ...rowSub, color: "#1877D6", fontWeight: 600 }}>
                                {overdue} day{overdue === 1 ? "" : "s"} overdue
                              </div>
                            </div>
                          </Row>
                        );
                      })}

                      {s.key === "stale" && stale.map((p, i) => (
                        <Row key={p.id} top={i > 0}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={rowTitle}>{p.name}</div>
                            <div style={rowSub}>
                              {p.last_date ? `Last lesson ${formatDate(p.last_date)}` : "No lessons yet"}
                            </div>
                          </div>
                          <ActionBtn onClick={() => navigate({ to: "/lessons/new" })} variant="primary">Book</ActionBtn>
                        </Row>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const rowTitle = {
  fontSize: 14, fontWeight: 600, color: "#0B1F3A",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
};
const rowSub = { fontSize: 12, color: "#6B7280", marginTop: 2 };

const actionBase = {
  height: 30, padding: "0 10px", borderRadius: 8,
  fontSize: 12, fontWeight: 600, cursor: "pointer",
  fontFamily: "Inter, sans-serif", border: "none",
} as const;

function ActionBtn({
  children, onClick, variant = "ghost", disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const styles = variant === "primary"
    ? { background: disabled ? "#cbd5e1" : "#1877D6", color: "#fff", border: "none" as const }
    : { background: "#fff", color: disabled ? "#9CA3AF" : "#1877D6", border: `1px solid ${disabled ? "#e3e6ec" : "#1877D6"}` };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...actionBase, ...styles,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Row({ children, top }: { children: React.ReactNode; top: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 14px", background: "#fff",
      borderTop: top ? "0.5px solid #EEF2F7" : "none",
    }}>
      {children}
    </div>
  );
}
