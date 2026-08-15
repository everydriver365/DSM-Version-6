import { Separator } from "@/components/ui/separator";
import { typography } from "@/lib/typography";
import { useMemo } from "react";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export interface ScheduleDateDividerProps {
  date?: Date;
  label?: string;
}

export function ScheduleDateDivider({ date, label }: ScheduleDateDividerProps) {
  const dateLabel = useMemo(() => {
    if (label) return label;
    if (!date) return "";
    const day = DAY_NAMES[date.getDay()].slice(0, 3);
    return `${day} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  }, [date, label]);

  return (
    <div className="flex items-center gap-2.5 mb-1.5">
      <span
        style={{
          fontSize: typography.sizes.sectionLabel,
          fontWeight: typography.weights.bold,
          color: typography.colors.accent,
          letterSpacing: "0.3px",
          textTransform: "uppercase",
          fontFamily: typography.family,
        }}
      >
        {dateLabel}
      </span>
      <Separator className="flex-1 bg-border" />
    </div>
  );
}
