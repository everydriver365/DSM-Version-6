import { Separator } from "@/components/ui/separator";
import { typography } from "@/lib/typography";

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
  date: Date;
}

export function ScheduleDateDivider({ date }: ScheduleDateDividerProps) {
  const day = DAY_NAMES[date.getDay()].slice(0, 3);
  const dateLabel = `${day} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;

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
