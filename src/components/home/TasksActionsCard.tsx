import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconReceipt,
  IconCalendar,
  IconMessage,
  IconChevronRight,
  IconListCheck,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { calculateOutstandingOwed } from "@/lib/paymentsOwed";

const PF = "Poppins, sans-serif";
const HF = "Sora, Poppins, sans-serif";
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const MUTED = "#6B7A8F";
const HAIRLINE = "#E5E7EB";

const TONES = {
  danger: {
    accent: "#FF3B30",
    iconBg: "#FFF0F0",
    iconColor: "#D32F2F",
    pillBg: "#FFECEC",
    pillText: "#D32F2F",
  },
  warning: {
    accent: "#FF9500",
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
    pillBg: "#FFF3E0",
    pillText: "#EA580C",
  },
  muted: {
    accent: "#9CA3AF",
    iconBg: "#F3F4F6",
    iconColor: "#6B7280",
    pillBg: "#F3F4F6",
    pillText: "#4B5563",
  },
} as const;

export type TaskTone = "danger" | "warning" | "muted";

export type TaskItem = {
  id: string;
  title: string;
  /** Short secondary line shown beneath the title. */
  subtitle?: string;
  /** Right-hand value: amount, "Overdue", etc. Omit for a chevron-only row. */
  value?: string;
  tone: TaskTone;
  /** Icon tile colour + glyph */
  Icon: React.ComponentType<{ size?: number; color?: string; stroke?: number }>;
  iconColor?: string;
  iconBg?: string;
  /** Sort weight — lower is more urgent */
  weight: number;
  onPress: () => void;
};

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function daysFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function dueLabel(days: number): { value: string; tone: TaskTone; weight: number; subtitle: string } {
  if (days < 0) return { value: "Overdue", tone: "danger", weight: 0, subtitle: "Due now" };
  if (days === 0) return { value: "Due today", tone: "danger", weight: 1, subtitle: "Due now" };
  if (days === 1) return { value: "Due tomorrow", tone: "warning", weight: 2, subtitle: "Due tomorrow" };
  return { value: `In ${days} days`, tone: "muted", weight: 3 + Math.min(days, 30), subtitle: `In ${days} days` };
}

/**
 * Builds the live task rows from data the app already stores.
 * Pass `items` to the card instead to render a fixed/mock list.
 */
function useTaskItems(userId: string | null | undefined): TaskItem[] {
  const navigate = useNavigate();
  const [owed, setOwed] = useState<{ total: number; name: string | null; count: number } | null>(null);
  const [unread, setUnread] = useState(0);
  const [todos, setTodos] = useState<
    { id: string; title: string; due_date: string | null }[]
  >([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const [unpaidRes, unreadRes, todoRes] = await Promise.all([
          supabase
            .from("lessons")
            .select("amount_due, paid_amount, pupils(name)")
            .eq("instructor_id", userId)
            .in("payment_status", ["unpaid", "partial"])
            .not("lesson_type", "eq", "event")
            .is("deleted_at", null)
            .limit(200),
          supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("instructor_id", userId)
            .eq("sender_type", "pupil")
            .is("read_at", null)
            .is("deleted_at", null),
          supabase
            .from("todos")
            .select("id, title, due_date")
            .eq("instructor_id", userId)
            .eq("completed", false)
            .not("due_date", "is", null)
            .order("due_date", { ascending: true })
            .limit(5),
        ]);

        if (cancelled) return;

        const rows = ((unpaidRes.data ?? []) as Array<{
          amount_due: number | null;
          paid_amount: number | null;
          pupils?: { name?: string | null } | null;
        }>).filter((r) => Math.max(0, Number(r.amount_due || 0) - Number(r.paid_amount || 0)) > 0);
        const total = calculateOutstandingOwed(rows);
        const names = new Set(rows.map((r) => r.pupils?.name).filter(Boolean) as string[]);
        const firstName = rows[0]?.pupils?.name ?? null;
        setOwed({
          total,
          name: names.size === 1 && firstName ? firstName : null,
          count: rows.length,
        });
        setUnread(unreadRes.count ?? 0);
        setTodos((todoRes.data ?? []) as typeof todos);
      } catch {
        /* leave rows empty on failure — the card just hides */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return useMemo(() => {
    const items: TaskItem[] = [];

    if (owed && owed.total > 0) {
      items.push({
        id: "owed",
        title:
          owed.count > 1 || !owed.name
            ? `Confirm ${owed.count} outstanding payment${owed.count === 1 ? "" : "s"}`
            : `Confirm payment – ${owed.name}`,
        subtitle: "Review and confirm",
        value: money(owed.total),
        tone: "warning",
        Icon: IconReceipt,
        weight: 1,
        onPress: () => navigate({ to: "/payments" as never }),
      });
    }

    for (const t of todos) {
      if (!t.due_date) continue;
      const d = dueLabel(daysFromToday(t.due_date));
      items.push({
        id: `todo-${t.id}`,
        title: t.title,
        subtitle: d.subtitle,
        value: d.value,
        tone: d.tone,
        Icon: IconCalendar,
        weight: d.weight,
        onPress: () => navigate({ to: "/todos" as never }),
      });
    }

    if (unread > 0) {
      items.push({
        id: "unread",
        title: `${unread} unread message${unread === 1 ? "" : "s"}`,
        subtitle: "Tap to view",
        tone: "muted",
        Icon: IconMessage,
        weight: 4,
        onPress: () => navigate({ to: "/messages" as never }),
      });
    }

    return items.sort((a, b) => a.weight - b.weight);
  }, [owed, unread, todos, navigate]);
}

type Props = {
  userId?: string | null;
  /** Override the live rows (used for design mock-ups). */
  items?: TaskItem[];
  /** Max rows shown before "See all". Defaults to 2 to match the compact reference design. */
  limit?: number;
  /** Section header rendered above the tile, only when rows exist. */
  header?: React.ReactNode;
};

function ValuePill({ value, tone }: { value: string; tone: TaskTone }) {
  const t = TONES[tone];
  const isMoney = value.startsWith("£");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        color: t.pillText,
        background: t.pillBg,
        fontFamily: PF,
      }}
    >
      {!isMoney && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: t.pillText,
          }}
        />
      )}
      {value}
    </span>
  );
}

export function TasksActionsCard({ userId, items, limit = 2, onSeeAll }: Props) {
  const navigate = useNavigate();
  const live = useTaskItems(items ? null : userId);
  const all = items ?? live;
  const rows = all.slice(0, limit);

  if (rows.length === 0) return null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 30,
        border: `0.5px solid ${HAIRLINE}`,
        boxShadow: "0 8px 24px rgba(11,31,58,0.06)",
        padding: "20px 20px 22px",
        fontFamily: PF,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          paddingLeft: 4,
          paddingRight: 4,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: NAVY,
            fontFamily: HF,
            letterSpacing: "-0.3px",
          }}
        >
          Tasks & actions
        </span>
        <button
          type="button"
          onClick={() => (onSeeAll ? onSeeAll() : navigate({ to: "/todos" as never }))}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: BLUE,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: PF,
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          See all
          <IconChevronRight size={16} stroke={2.5} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((item, i) => {
          const Icon = item.Icon ?? IconListCheck;
          const tone = TONES[item.tone];
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onPress}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 18px",
                marginLeft: 0,
                marginRight: 0,
                background: "transparent",
                border: "none",
                borderTop: i === 0 ? "none" : `0.5px solid ${HAIRLINE}`,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: PF,
                position: "relative",
              }}
            >
              {/* Full-height left accent line */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 12,
                  bottom: 12,
                  width: 4,
                  borderRadius: 999,
                  background: tone.accent,
                }}
              />

              <span
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  flexShrink: 0,
                  background: item.iconBg ?? tone.iconBg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={24} color={item.iconColor ?? tone.iconColor} stroke={1.7} />
              </span>

              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: NAVY,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.title}
                </span>
                {item.subtitle && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: MUTED,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.subtitle}
                  </span>
                )}
              </span>

              <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {item.value ? (
                  <ValuePill value={item.value} tone={item.tone} />
                ) : null}
                <IconChevronRight size={20} color="#C7CDD9" stroke={2} style={{ flexShrink: 0 }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TasksActionsCard;
