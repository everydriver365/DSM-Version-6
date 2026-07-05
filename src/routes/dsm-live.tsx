import { createFileRoute, Outlet } from "@tanstack/react-router";

export type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  host_name: string | null;
  session_date: string;
  session_time: string;
  duration_minutes: number | null;
  max_spaces: number;
  spaces_taken: number;
  price_amount: number | null;
  price_display: string | null;
  status: string | null;
  image_url: string | null;
  is_live: boolean | null;
};

export const CATEGORIES = [
  "All",
  "Standards Check",
  "Business Coaching",
  "CPD Webinar",
  "New ADI",
  "Q&A",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "Standards Check": "#1A52A0",
  "Business Coaching": "#16A34A",
  "CPD Webinar": "#7C3AED",
  "New ADI": "#D97706",
  "Q&A": "#0891B2",
};

export function categoryColor(c: string | null | undefined): string {
  return (c && CATEGORY_COLORS[c]) || "#0F2044";
}

export function formatSessionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatSessionTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return timeStr;
  }
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now.getTime()) / 86400000);
}

export const Route = createFileRoute("/dsm-live")({
  component: DsmLiveLayout,
});

function DsmLiveLayout() {
  return <Outlet />;
}
