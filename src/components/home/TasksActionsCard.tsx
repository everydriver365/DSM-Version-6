import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconCash,
  IconCalendarCheck,
  IconMessage,
  IconChevronRight,
  IconListCheck,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { calculateOutstandingOwed } from "@/lib/paymentsOwed";
import { tokens } from "@/lib/tokens";

const PF = "Poppins, sans-serif";
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const AMBER = "#D68A1B";
const GREY = "#9CA3AF";
const BORDER = "#EDF1F6";

export type TaskTone = "danger" | "warning" | "muted";

export type TaskItem = {
  id: string;
  title: string;
  /** Right-hand value: amount, "Due today", etc. Omit for a chevron-only row. */
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

const toneColor: Record<TaskTone, string> = {
  danger: RED,
  warning: AMBER,
  muted: GREY,
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

function dueLabel(days: number): { value: string; tone: TaskTone; weight: number } {
  if (days < 0) return { value: "Overdue", tone: "danger", weight: 0 };
  if (days === 0) return { value: "Due today", tone: "danger", weight: 1 };
  if (days === 1) return { value: "Due tomorrow", tone: "warning", weight: 2 };
  return { value: `In ${days} days`, tone: "muted", weight: 3 + Math.min(days, 30) };
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
        value: money(owed.total),
        tone: "danger",
        Icon: IconCash,
        iconColor: "#FFFFFF",
        iconBg: "#F5A524",
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
        value: d.value,
        tone: d.tone,
        Icon: IconCalendarCheck,
        iconColor: NAVY,
        iconBg: "#F2F5F9",
        weight: d.weight,
        onPress: () => navigate({ to: "/todos" as never }),
      });
    }

    if (unread > 0) {
      items.push({
        id: "unread",
        title: `${unread} unread message${unread === 1 ? "" : "s"}`,
        tone: "muted",
        Icon: IconMessage,
        iconColor: BLUE,
        iconBg: "#EAF2FE",
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
  /** Max rows shown before "See all". */
  limit?: number;
  onSeeAll?: () => void;
};

export function TasksActionsCard({ userId, items, limit = 4, onSeeAll }: Props) {
  const navigate = useNavigate();
  const live = useTaskItems(items ? null : userId);
  const all = items ?? live;
  const rows = all.slice(0, limit);

  if (rows.length === 0) return null;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.bold,
            color: NAVY,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontFamily: PF,
          }}
        >
          Tasks &amp; Actions
        </span>
        <button
          type="button"
          onClick={() => (onSeeAll ? onSeeAll() : navigate({ to: "/todos" as never }))}
          style={{
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.semibold,
            color: BLUE,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: PF,
          }}
        >
          See all
        </button>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          border: `0.5px solid ${BORDER}`,
          boxShadow: "0 1px 2px rgba(11,31,58,0.04), 0 4px 12px rgba(11,31,58,0.06)",
          overflow: "hidden",
          fontFamily: PF,
        }}
      >
        {rows.map((item, i) => {
          const Icon = item.Icon ?? IconListCheck;
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
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                borderTop: i === 0 ? "none" : `0.5px solid ${BORDER}`,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: PF,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: item.iconBg ?? "#F2F5F9",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color={item.iconColor ?? NAVY} stroke={1.7} />
              </span>

              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 15,
                  fontWeight: tokens.fontWeight.semibold,
                  color: NAVY,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.title}
              </span>

              {item.value ? (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: tokens.fontWeight.bold,
                    color: toneColor[item.tone],
                    flexShrink: 0,
                  }}
                >
                  {item.value}
                </span>
              ) : (
                <IconChevronRight size={18} color="#C7CDD9" stroke={1.8} style={{ flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default TasksActionsCard;
