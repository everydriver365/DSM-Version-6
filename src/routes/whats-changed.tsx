import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { IconBolt, IconBriefcase, IconCalendarCheck, IconCalendarX, IconChevronRight, IconCircleCheck, IconCreditCard, IconMail, IconMessage, IconPlayerPlay, IconShoppingBag, IconVideo } from "@tabler/icons-react";
import { toast } from "sonner";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/whats-changed")({
  head: () => ({
    meta: [
      { title: "What's changed — DSM by EveryDriver" },
      {
        name: "description",
        content: "Everything that happened in your driving school since your last login.",
      },
      { property: "og:title", content: "What's changed — DSM by EveryDriver" },
      {
        property: "og:description",
        content: "Everything that happened in your driving school since your last login.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhatsChangedPage,
});

const FONT = { fontFamily: "Poppins, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GRAY = "#6B7A90";
const BORDER = "#E2E8F0";

type ItemKind =
  | "lesson_new"
  | "lesson_cancelled"
  | "message"
  | "payment"
  | "card_payment"
  | "gap"
  | "enquiry"
  | "job"
  | "live"
  | "learn"
  | "marketplace";

type Item = {
  id: string;
  kind: ItemKind;
  title: string;
  subtitle: string;
  raw: any;
};

type Section = {
  key: ItemKind;
  label: string;
  icon: React.ReactNode;
  items: Item[];
};

function pupilName(row: any): string {
  const p = Array.isArray(row?.pupils) ? row.pupils[0] : row?.pupils;
  return p?.name || p?.first_name || "Pupil";
}

function fmtDate(ymd?: string | null): string {
  if (!ymd) return "";
  const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(ymd);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(t?: string | null): string {
  return (t ?? "").slice(0, 5);
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(n: unknown): string {
  const v = Number(n ?? 0);
  return `£${v.toFixed(2)}`;
}

function truncate(s: string, n = 70): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) return "Never checked";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never checked";
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
}

function WhatsChangedPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const key = `dsm.lastLogin.${userId}`;
      let last: string | null = null;
      try {
        last = localStorage.getItem(key);
      } catch {}
      setLastUpdated(last);
      const since = last ? new Date(last) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sinceIso = (Number.isNaN(since.getTime())
        ? new Date(Date.now() - 24 * 60 * 60 * 1000)
        : since
      ).toISOString();
      // Do NOT update lastLogin here — update after queries

      async function safeQuery(fn: () => PromiseLike<any>) {
        try {
          return await fn();
        } catch {
          return { data: [] };
        }
      }

      const [
        lessonsNew,
        lessonsCanc,
        messages,
        payments,
        gaps,
        enquiries,
        jobs,
        live,
        learn,
        listings,
        cardPayments,
      ] = await Promise.all([
        safeQuery(() =>
          supabase
            .from("lessons")
            .select(
              "id, pupil_id, lesson_date, lesson_time, duration_minutes, pickup_location, status, amount_due, pupils(name, first_name)",
            )
            .eq("instructor_id", userId)
            .neq("status", "cancelled")
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("lessons")
            .select("id, pupil_id, lesson_date, lesson_time, pupils(name, first_name)")
            .eq("instructor_id", userId)
            .eq("status", "cancelled")
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("chat_messages")
            .select("id, pupil_id, body, created_at, pupils(name, first_name)")
            .eq("instructor_id", userId)
            .eq("sender_type", "pupil")
            .is("read_at", null)
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("lessons")
            .select(
              "id, pupil_id, lesson_date, amount_due, paid_amount, payment_method, pupils(name, first_name)",
            )
            .eq("instructor_id", userId)
            .eq("payment_status", "paid")
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("gap_filler_offers")
            .select("id, pupil_id, slot_date, slot_time, duration_minutes, pupils(name, first_name)")
            .eq("instructor_id", userId)
            .eq("status", "accepted")
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("enquiries")
            .select("id, name, notes, course_interest, postcode, created_at")
            .eq("instructor_id", userId)
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("job_offers")
            .select("id, title, created_at")
            .eq("status", "open")
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("dsm_live_sessions")
            .select("id, title, session_date, session_time")
            .is("deleted_at", null)
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("learn_videos")
            .select("id, title, duration, thumbnail_url")
            .not("url", "is", null)
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("marketplace_listings")
            .select("id, title, price_display, image_urls")
            .eq("is_active", true)
            .is("deleted_at", null)
            .gte("created_at", sinceIso),
        ),
        safeQuery(() =>
          supabase
            .from("lesson_history")
            .select("id, pupil_id, amount_paid, payment_method, created_at, pupils(name, first_name)")
            .eq("instructor_id", userId)
            .eq("payment_status", "paid")
            .not("payment_method", "eq", "cancellation")
            .gte("created_at", sinceIso),
        ),
      ]);

      if (cancelled) return;

      const rowsOf = (res: any): any[] => (res?.data ?? []) as any[];

      const built: Section[] = ([
        {
          key: "lesson_new",
          label: "New bookings",
          icon: <IconCalendarCheck size={16} color="#1B7F3B" />,
          items: rowsOf(lessonsNew).map((r) => ({
            id: String(r.id),
            kind: "lesson_new" as const,
            title: pupilName(r),
            subtitle: `${fmtDate(r.lesson_date)} · ${fmtTime(r.lesson_time)}`,
            raw: r,
          })),
        },
        {
          key: "lesson_cancelled",
          label: "Cancellations",
          icon: <IconCalendarX size={16} color="#CC2229" />,
          items: rowsOf(lessonsCanc).map((r) => ({
            id: String(r.id),
            kind: "lesson_cancelled" as const,
            title: pupilName(r),
            subtitle: `${fmtDate(r.lesson_date)} · ${fmtTime(r.lesson_time)}`,
            raw: r,
          })),
        },
        {
          key: "message",
          label: "New messages",
          icon: <IconMessage size={16} color={BLUE} />,
          items: rowsOf(messages).map((r) => ({
            id: String(r.id),
            kind: "message" as const,
            title: pupilName(r),
            subtitle: truncate(r.body ?? ""),
            raw: r,
          })),
        },
        {
          key: "payment",
          label: "Payments received",
          icon: <IconCreditCard size={16} color="#1B7F3B" />,
          items: rowsOf(payments).map((r) => ({
            id: String(r.id),
            kind: "payment" as const,
            title: pupilName(r),
            subtitle: `${money(r.paid_amount ?? r.amount_due)} · ${fmtDate(r.lesson_date)}`,
            raw: r,
          })),
        },
        {
          key: "card_payment",
          label: "Card payments received",
          icon: <IconCreditCard size={16} color="#15803D" />,
          items: rowsOf(cardPayments).map((r) => ({
            id: String(r.id),
            kind: "card_payment" as const,
            title: pupilName(r),
            subtitle: `£${Number(r.amount_paid ?? 0).toFixed(2)} · ${r.payment_method ?? "card"}`,
            raw: r,
          })),
        },
        {
          key: "gap",
          label: "Slots accepted",
          icon: <IconBolt size={16} color="#1B7F3B" />,
          items: rowsOf(gaps).map((r) => ({
            id: String(r.id),
            kind: "gap" as const,
            title: pupilName(r),
            subtitle: `${fmtDate(r.slot_date)} · ${fmtTime(r.slot_time)}`,
            raw: r,
          })),
        },
        {
          key: "enquiry",
          label: "New enquiries",
          icon: <IconMail size={16} color={BLUE} />,
          items: rowsOf(enquiries).map((r) => ({
            id: String(r.id),
            kind: "enquiry" as const,
            title: r.name || "Enquiry",
            subtitle: truncate(
              r.course_interest
                ? `${r.course_interest}${r.postcode ? " · " + r.postcode : ""}`
                : r.notes ?? "New enquiry",
            ),
            raw: r,
          })),
        },
        {
          key: "job",
          label: "New jobs",
          icon: <IconBriefcase size={16} color="#B5661E" />,
          items: rowsOf(jobs).map((r) => ({
            id: String(r.id),
            kind: "job" as const,
            title: r.title || "Job offer",
            subtitle: fmtDateTime(r.created_at),
            raw: r,
          })),
        },
        {
          key: "live",
          label: "DSM Live",
          icon: <IconVideo size={16} color={BLUE} />,
          items: rowsOf(live).map((r) => ({
            id: String(r.id),
            kind: "live" as const,
            title: r.title || "Live session",
            subtitle: `${fmtDate(r.session_date)} · ${fmtTime(r.session_time)}`,
            raw: r,
          })),
        },
        {
          key: "learn",
          label: "New tutorials",
          icon: <IconPlayerPlay size={16} color="#7C3AED" />,
          items: rowsOf(learn).map((r) => ({
            id: String(r.id),
            kind: "learn" as const,
            title: r.title || "Tutorial",
            subtitle: r.duration ? String(r.duration) : "DSM Learn",
            raw: r,
          })),
        },
        {
          key: "marketplace",
          label: "New listings",
          icon: <IconShoppingBag size={16} color="#B5661E" />,
          items: rowsOf(listings).map((r) => ({
            id: String(r.id),
            kind: "marketplace" as const,
            title: r.title || "Listing",
            subtitle: r.price_display ? String(r.price_display) : "Marketplace",
            raw: r,
          })),
        },
      ] as Section[]).filter((s) => s.items.length > 0);

      setSections(built);
      const nowIso = new Date().toISOString();
      setLastUpdated(nowIso);
      setLoading(false);
      try {
        localStorage.setItem(key, nowIso);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (to: string) => {
    setSelected(null);
    navigate({ to } as never);
  };

  return (
    <DSMTopSheet title="What's Changed">
      <div className="pb-24" style={{ ...FONT, backgroundColor: tokens.canvas }}>
      <div style={{ padding: "8px 16px 12px", fontSize: 12, color: GRAY, textAlign: "right" }}>
        Last updated: {formatLastUpdated(lastUpdated)}
      </div>

      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: GRAY, fontSize: 13 }}>
            Loading…
          </div>
        ) : sections.length === 0 ? (
          <div style={{ padding: "56px 0", textAlign: "center" }}>
            <IconCircleCheck size={44} color="#1B7F3B" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 17, fontWeight: tokens.fontWeight.bold, color: NAVY }}>You're all caught up</div>
            <div style={{ fontSize: tokens.fontSize.base, color: GRAY, marginTop: 4 }}>
              Nothing new since your last visit.
            </div>
          </div>
        ) : (
          sections.map((s) => (
            <div key={s.key} style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {s.icon}
                  <span style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: NAVY }}>{s.label}</span>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: tokens.fontWeight.bold,
                    color: BLUE,
                    background: "#E5EFFA",
                    borderRadius: 999,
                    padding: "2px 9px",
                  }}
                >
                  {s.items.length}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {s.items.map((it) => (
                  <button
                    key={`${it.kind}-${it.id}`}
                    type="button"
                    onClick={() => setSelected(it)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      background: tokens.white,
                      border: `0.5px solid ${BORDER}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: tokens.fontSize.md,
                          fontWeight: tokens.fontWeight.semibold,
                          color: NAVY,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {it.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: GRAY,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {it.subtitle}
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#9AA5B4" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && <DetailSheet item={selected} onClose={() => setSelected(null)} onGo={go} />}
      </div>
    </DSMTopSheet>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderBottom: `0.5px solid ${BORDER}`,
      }}
    >
      <span style={{ fontSize: 12.5, color: GRAY }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: tokens.fontWeight.semibold, color: NAVY, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function DetailSheet({
  item,
  onClose,
  onGo,
}: {
  item: Item;
  onClose: () => void;
  onGo: (to: string) => void;
}) {
  const r = item.raw;

  let title = item.title;
  let body: React.ReactNode = null;
  let cta = { label: "View →", to: "/home" };

  switch (item.kind) {
    case "lesson_new":
      title = "New booking";
      body = (
        <>
          <Field label="Pupil" value={pupilName(r)} />
          <Field label="Date" value={fmtDate(r.lesson_date)} />
          <Field label="Time" value={fmtTime(r.lesson_time)} />
          <Field label="Duration" value={r.duration_minutes ? `${r.duration_minutes} min` : ""} />
          <Field label="Pickup" value={r.pickup_location ?? ""} />
          <Field label="Amount due" value={money(r.amount_due)} />
          <Field label="Status" value={r.status ?? ""} />
        </>
      );
      cta = { label: "View lesson →", to: `/lessons/${r.id}` };
      break;
    case "lesson_cancelled":
      title = "Cancelled lesson";
      body = (
        <>
          <Field label="Pupil" value={pupilName(r)} />
          <Field label="Date" value={fmtDate(r.lesson_date)} />
          <Field label="Time" value={fmtTime(r.lesson_time)} />
        </>
      );
      cta = { label: "View pupil →", to: `/pupils/${r.pupil_id}` };
      break;
    case "message":
      title = "New message";
      body = (
        <>
          <Field label="Pupil" value={pupilName(r)} />
          <Field label="Sent" value={fmtDateTime(r.created_at)} />
          <div style={{ paddingTop: 12, fontSize: tokens.fontSize.md, color: NAVY, lineHeight: 1.5 }}>{r.body}</div>
        </>
      );
      cta = { label: "Reply →", to: `/messages/${r.pupil_id}` };
      break;
    case "payment":
      title = "Payment received";
      body = (
        <>
          <Field label="Pupil" value={pupilName(r)} />
          <Field label="Amount paid" value={money(r.paid_amount ?? r.amount_due)} />
          <Field label="Lesson date" value={fmtDate(r.lesson_date)} />
          <Field label="Method" value={r.payment_method ?? "—"} />
        </>
      );
      cta = { label: "View payments →", to: `/pupils/${r.pupil_id}` };
      break;
    case "card_payment":
      title = "Card payment received";
      body = (
        <>
          <Field label="Pupil" value={pupilName(r)} />
          <Field label="Amount paid" value={money(r.amount_paid ?? r.lesson_cost)} />
          <Field label="Method" value={r.payment_method ?? "Card"} />
          <Field label="Received" value={fmtDateTime(r.created_at)} />
        </>
      );
      cta = { label: "View payments →", to: `/pupils/${r.pupil_id}` };
      break;
    case "gap":
      title = "Slot accepted";
      body = (
        <>
          <Field label="Pupil" value={pupilName(r)} />
          <Field label="Date" value={fmtDate(r.slot_date)} />
          <Field label="Time" value={fmtTime(r.slot_time)} />
          <Field label="Duration" value={r.duration_minutes ? `${r.duration_minutes} min` : ""} />
        </>
      );
      cta = { label: "View gap filler →", to: "/gaps" };
      break;
    case "enquiry":
      title = "New enquiry";
      body = (
        <>
          <Field label="From" value={r.name || "Enquiry"} />
          {r.course_interest && <Field label="Interest" value={r.course_interest} />}
          {r.postcode && <Field label="Postcode" value={r.postcode} />}
          <Field label="Received" value={fmtDateTime(r.created_at)} />
          {r.notes && (
            <div style={{ paddingTop: 12, fontSize: tokens.fontSize.md, color: NAVY, lineHeight: 1.5 }}>
              {r.notes}
            </div>
          )}
        </>
      );
      cta = { label: "View enquiries →", to: "/enquiries" };
      break;
    case "job":
      title = "New job offer";
      body = (
        <>
          <Field label="Title" value={r.title || "Job offer"} />
          <Field label="Posted" value={fmtDateTime(r.created_at)} />
        </>
      );
      cta = { label: "View jobs →", to: "/jobs" };
      break;
    case "live":
      title = "DSM Live session";
      body = (
        <>
          <Field label="Session" value={r.title || "Live session"} />
          <Field label="Date" value={fmtDate(r.session_date)} />
          <Field label="Time" value={fmtTime(r.session_time)} />
        </>
      );
      cta = { label: "View session →", to: `/dsm-live/${r.id}` };
      break;
    case "learn":
      title = "New tutorial";
      body = (
        <>
          {r.thumbnail_url && (
            <img
              src={r.thumbnail_url}
              alt={r.title || "Tutorial thumbnail"}
              style={{
                width: "100%",
                borderRadius: 8,
                marginBottom: 12,
                objectFit: "cover",
                maxHeight: 180,
              }}
            />
          )}
          <Field label="Title" value={r.title || "Tutorial"} />
          <Field label="Duration" value={r.duration ? String(r.duration) : ""} />
        </>
      );
      cta = { label: "Watch →", to: "/learn" };
      break;
    case "marketplace":
      title = "New listing";
      body = (
        <>
          {Array.isArray(r.image_urls) && r.image_urls[0] && (
            <img
              src={r.image_urls[0]}
              alt={r.title || "Listing image"}
              style={{
                width: "100%",
                borderRadius: 8,
                marginBottom: 12,
                objectFit: "cover",
                maxHeight: 180,
              }}
            />
          )}
          <Field label="Title" value={r.title || "Listing"} />
          <Field label="Price" value={r.price_display ?? ""} />
        </>
      );
      cta = { label: "View listing →", to: `/marketplace/${r.id}` };
      break;
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <div
        style={{
          background: tokens.white,
          borderRadius: 8,
          border: `0.5px solid ${BORDER}`,
          padding: "4px 14px 14px",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {body}
      </div>
      <button
        type="button"
        onClick={() => onGo(cta.to)}
        style={{
          width: "100%",
          marginTop: 14,
          padding: "14px 16px",
          borderRadius: tokens.radiusCard,
          background: BLUE,
          color: tokens.white,
          fontWeight: tokens.fontWeight.semibold,
          fontSize: 15,
          border: "none",
          cursor: "pointer",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {cta.label}
      </button>
    </BottomSheet>
  );
}
