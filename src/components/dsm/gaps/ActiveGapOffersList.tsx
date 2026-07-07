/**
 * Ported from `@everydriver`
 * (`src/components/instructor/ActiveGapOffersList.tsx`).
 *
 * Refactor from source:
 *   - Removed every `supabase.from(...)` call, realtime subscription and
 *     `supabase.functions.invoke` — this file has NO supabase import.
 *   - Offers now arrive via the `offers` prop; loading is driven by
 *     the `loading` prop.
 *   - Cancel is delegated to the caller through the `onCancel(id)`
 *     callback prop; this component no longer notifies pupils on cancel.
 *   - Dropped dependency on the source project's `Tile` / `Pill`
 *     wrappers (which import supabase transitively). Rendered inline
 *     with the same layout, colours and spacing.
 */
import { useEffect, useState } from "react";
import { XCircle, Loader2, Zap } from "lucide-react";

export type GapOfferStatus = "open" | "filled" | "expired" | "cancelled";

export interface GapOfferRow {
  id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: GapOfferStatus;
  expires_at: string | null;
  pupil_id: string | null;
  recipient_count?: number;
  claimer_name?: string | null;
}

interface Props {
  offers: GapOfferRow[];
  loading?: boolean;
  onCancel: (id: string) => void;
}

const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 || 12;
  return `${h12}:${m}${ampm}`;
};

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const useCountdown = (target: string | null) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function Pill({ color, label }: { color: "amber" | "green" | "grey"; label: string }) {
  const palette: Record<typeof color, { bg: string; fg: string }> = {
    amber: { bg: "#FEF3C7", fg: "#92400E" },
    green: { bg: "#DCFCE7", fg: "#166534" },
    grey: { bg: "#F1F5F9", fg: "#64748B" },
  };
  const c = palette[color];
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        borderRadius: 999,
        padding: "2px 8px",
        fontFamily: "Poppins, system-ui, sans-serif",
      }}
    >
      {label}
    </span>
  );
}

function OfferRow({ offer, onCancel }: { offer: GapOfferRow; onCancel: (id: string) => void }) {
  const remaining = useCountdown(offer.status === "open" ? offer.expires_at : null);

  const title = `${formatDate(offer.lesson_date)} · ${formatTime(offer.start_time)}–${formatTime(offer.end_time)}`;
  const subtitleParts: string[] = [`${offer.recipient_count ?? 0} notified`];
  if (offer.status === "filled" && offer.claimer_name) {
    subtitleParts.push(`Claimed by ${offer.claimer_name}`);
  }
  const subtitle = subtitleParts.join(" · ");

  const eyebrow =
    offer.status === "open" && remaining
      ? remaining === "expired"
        ? "Expired"
        : `Expires in ${remaining}`
      : undefined;

  const pillColor: "amber" | "green" | "grey" =
    offer.status === "open" ? "amber" : offer.status === "filled" ? "green" : "grey";

  const iconColor =
    offer.status === "filled" ? "#2d8a4e" : offer.status === "open" ? "#d97706" : "#888888";
  const iconBg =
    offer.status === "filled" ? "#DCFCE7" : offer.status === "open" ? "#FEF3C7" : "#F1F5F9";

  const dimmed =
    offer.status === "filled" || offer.status === "expired" || offer.status === "cancelled";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "0.5px solid hsl(var(--dsm-border))",
        boxShadow: "var(--shadow-card)",
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: dimmed ? 0.72 : 1,
        fontFamily: "Poppins, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Zap size={18} strokeWidth={2} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && (
          <div style={{ fontSize: 10, fontWeight: 600, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
            {eyebrow}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F1B2D", lineHeight: 1.25 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "#7A8FAA", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <Pill color={pillColor} label={offer.status} />
        {offer.status === "open" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(offer.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#c9302c",
              fontSize: 11,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <XCircle size={12} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function ActiveGapOffersList({ offers, loading = false, onCancel }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (offers.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1">
        Active gap offers
      </h3>
      <div className="space-y-2">
        {offers.map((o) => (
          <OfferRow key={o.id} offer={o} onCancel={onCancel} />
        ))}
      </div>
    </section>
  );
}