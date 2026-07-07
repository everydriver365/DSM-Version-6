/**
 * Ported from `@everydriver`
 * (`src/components/instructor/ScheduleMobileChrome.tsx`).
 *
 * Refactor from source:
 *   - Removed `supabase` import + `useCombinedNotificationCount` +
 *     `useActiveTrackingSession` + `useAICallDivert` + `AICallDivertSheet`.
 *   - Removed the internal `TrackingPill` (which read `instructors` from
 *     Supabase). Callers can render their own tracking status externally.
 *   - `NavigateFunction` from react-router-dom replaced with a generic
 *     `(path: string) => void` prop so the component works with any
 *     router (this project uses TanStack Router).
 *   - Notification badge is now a plain `notificationCount` prop.
 *
 * ClassName strings, layout, spacing, radii, colours, shadows unchanged.
 */
import { Bell, Plus, Menu, RefreshCw, List, Columns3, CalendarRange, ChevronLeft } from "lucide-react";

type ViewMode = "list" | "week" | "month" | "calendar" | "schedule";

interface Stats {
  lessons: number;
  scheduled: number;
  free: number;
  overdue: number;
}

interface Props {
  profileImageUrl?: string | null;
  instructorName?: string | null;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onSync: () => void;
  isSyncing: boolean;
  onAdd: () => void;
  /** Router navigation callback. Pass a wrapper around your router's push. */
  navigate: (path: string) => void;
  stats: Stats;
  /** Total unread/badge count for the bell (0 hides badge). */
  notificationCount?: number;
}

const BORDER = "0.5px solid #e0e3ea";
const FONT = "Poppins, system-ui, sans-serif";

function CircleBtn({
  onClick,
  label,
  children,
  badge,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        position: "relative",
        width: 30,
        height: 30,
        borderRadius: 15,
        background: "#fff",
        border: BORDER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            minWidth: 14,
            height: 14,
            padding: "0 3px",
            borderRadius: 8,
            background: "#c9302c",
            color: "#fff",
            fontSize: 9,
            fontWeight: 600,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export function ScheduleMobileChrome({
  viewMode,
  setViewMode,
  onSync,
  isSyncing,
  onAdd,
  navigate,
  notificationCount = 0,
}: Props) {
  const now = new Date();
  const monthYear = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const dateLine = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const toggles: { label: string; target: ViewMode; Icon: typeof List }[] = [
    { label: "List", target: "list", Icon: List },
    { label: "Week", target: "week", Icon: Columns3 },
    { label: "Month", target: "month", Icon: CalendarRange },
  ];

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Nav bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <button
            onClick={() => navigate("/home")}
            aria-label="Back to home"
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              marginLeft: -6,
              cursor: "pointer",
              flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ChevronLeft size={20} strokeWidth={1.9} color="#1a1a1f" />
          </button>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a1f", letterSpacing: "-0.2px" }}>
            Schedule
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CircleBtn onClick={() => navigate("/notifications")} label="Notifications" badge={notificationCount}>
            <Bell size={14} strokeWidth={1.8} color="#6B6B6B" />
          </CircleBtn>
          <CircleBtn onClick={onAdd} label="Add">
            <Plus size={14} strokeWidth={1.8} color="#6B6B6B" />
          </CircleBtn>
          <CircleBtn onClick={() => navigate("/settings")} label="Menu">
            <Menu size={14} strokeWidth={1.8} color="#6B6B6B" />
          </CircleBtn>
        </div>
      </div>

      {/* Month / date header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a1f", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            {monthYear}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#aaa" }}>
            {dateLine} · Today
          </div>
        </div>
        <button
          onClick={onSync}
          disabled={isSyncing}
          aria-label="Sync calendar"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: "#fff",
            border: BORDER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <RefreshCw
            size={15}
            strokeWidth={1.8}
            color="#1a1a1f"
            style={isSyncing ? { animation: "spin 1s linear infinite" } : undefined}
          />
        </button>
      </div>

      {/* View toggle */}
      <div
        style={{
          background: "#fff",
          border: BORDER,
          borderRadius: 12,
          padding: 3,
          display: "flex",
          gap: 2,
        }}
      >
        {toggles.map(({ label, target, Icon }) => {
          const active = viewMode === target;
          return (
            <button
              key={label}
              onClick={() => setViewMode(target)}
              style={{
                flex: 1,
                borderRadius: 9,
                padding: "8px 0",
                background: active ? "#1a1a1f" : "transparent",
                color: active ? "#fff" : "#aaa",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: FONT,
              }}
            >
              <Icon size={13} strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}