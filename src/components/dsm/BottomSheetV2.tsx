import React, { useEffect } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";

// ---------------------------------------------------------------------------
// DSM DESIGN TOKENS
// ---------------------------------------------------------------------------
const navy = "#0B1F3A";
const blue = "#1877D6";
const red = "#CC2229";
const canvas = "#EEF2F7";
const cardShadow = "0 1px 3px rgba(11,31,58,0.06)";
const hairline = "#E4E8EF";
const subtle = "#6B7686";
const font = "Poppins, sans-serif";

const pupilColors = [
  "#1877D6",
  "#7C5CFC",
  "#E8833A",
  "#2FA86A",
  "#CC2229",
  "#0B1F3A",
  "#0FA3B1",
  "#B8860B",
];

const colorForPupil = (id: number): string => pupilColors[id % pupilColors.length];


// ---------------------------------------------------------------------------
// BottomSheet
// ---------------------------------------------------------------------------
export interface BottomSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({ title, subtitle, onClose, children, footer }: BottomSheetProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dsm-sheet-open"));
    }
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dsm-sheet-close"));
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ fontFamily: font }}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: canvas,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          maxHeight: "88vh",
        }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            className="rounded-full"
            style={{ width: 40, height: 5, backgroundColor: "#C7CDD6" }}
          />
        </div>

        <div className="px-5 pt-2 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                style={{
                  color: navy,
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "-0.6px",
                  lineHeight: 1.15,
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <div
                  className="mt-1"
                  style={{ color: subtle, fontSize: 14, fontWeight: 500 }}
                >
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full shrink-0 active:opacity-80"
              aria-label="Close"
              type="button"
              style={{ width: 30, height: 30, backgroundColor: canvas }}
            >
              <IconX stroke={1.5} size={16} color={subtle} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-2 flex-1">{children}</div>

        {footer && (
          <div
            className="px-4 pt-6 pb-6 shrink-0"
            style={{
              background: `linear-gradient(to bottom, rgba(238,242,247,0), ${canvas})`,
            }}
          >
            {footer}
          </div>
        )}

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatRow
// ---------------------------------------------------------------------------
export interface Stat {
  label: string;
  value: string;
}

export interface StatRowProps {
  stats: Stat[];
}

export function StatRow({ stats }: StatRowProps) {
  return (
    <div
      className="rounded-2xl bg-white grid mb-5"
      style={{ boxShadow: cardShadow, gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex flex-col items-center py-4"
          style={{ borderLeft: i === 0 ? "none" : "1px solid #EEF0F3" }}
        >
          <div className="text-xl font-semibold" style={{ color: navy }}>
            {s.value}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#8A93A3" }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionLabel
// ---------------------------------------------------------------------------
export interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div
      className="pt-1 pb-2 text-xs font-semibold tracking-wide"
      style={{ color: "#8A93A3" }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
export interface AvatarProps {
  name: string;
  id: number;
}

export function Avatar({ name, id }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{ width: 40, height: 40, backgroundColor: colorForPupil(id) }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrimaryButton
// ---------------------------------------------------------------------------
export interface PrimaryButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  color?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export function PrimaryButton({
  children,
  disabled,
  color = blue,
  onClick,
  type = "button",
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full py-4 text-white font-semibold text-base active:opacity-90 disabled:opacity-40"
      style={{ backgroundColor: color, borderRadius: 16 }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// GhostButton
// ---------------------------------------------------------------------------
export interface GhostButtonProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export function GhostButton({
  children,
  color = red,
  bg = "#FDEEEE",
  onClick,
  type = "button",
}: GhostButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full py-3 font-medium text-base mt-2"
      style={{ color, backgroundColor: bg, borderRadius: 16 }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Grouped list primitives (iOS-style)
// ---------------------------------------------------------------------------
export function SheetGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <div
      className={`bg-white overflow-hidden ${className}`}
      style={{ borderRadius: 16, border: "none", boxShadow: cardShadow, marginBottom: 12 }}
    >
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <SheetDivider />}
          {child}
        </React.Fragment>
      ))}
    </div>
  );
}

export function SheetDivider() {
  return <div style={{ height: 1, backgroundColor: hairline }} />;
}

export interface SheetRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function SheetRow({ children, onClick, selected, className = "" }: SheetRowProps) {
  const style: React.CSSProperties = {
    padding: "15px 16px",
    fontFamily: font,
    backgroundColor: selected ? "#F0F7FF" : "transparent",
  };
  if (!onClick) {
    return (
      <div className={`flex items-center gap-3 ${className}`} style={style}>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left active:bg-black/[0.03] ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

export function SheetRadio({ selected }: { selected: boolean }) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        border: selected ? "none" : "2px solid #C7D0DC",
        backgroundColor: selected ? blue : "transparent",
      }}
    >
      {selected && (
        <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#FFFFFF" }} />
      )}
    </div>
  );
}

export interface SheetRadioRowProps {
  title: string;
  subtitle?: string;
  status?: string;
  statusTag?: string;
  statusPositive?: boolean;
  selected: boolean;
  onSelect: () => void;
  leading?: React.ReactNode;
}

export function SheetRadioRow({
  title,
  subtitle,
  status,
  statusTag,
  statusPositive = true,
  selected,
  onSelect,
  leading,
}: SheetRadioRowProps) {
  return (
    <SheetRow onClick={onSelect} selected={selected}>
      <SheetRadio selected={selected} />
      {leading}
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{ fontSize: 16, fontWeight: 600, color: navy }}
        >
          {title}
        </div>
        {subtitle && (
          <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: subtle }}>
            {subtitle}
          </div>
        )}
      </div>
      {(status || statusTag) && (
        <div className="text-right shrink-0">
          {status && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: statusPositive ? "#1A9B5C" : red,
              }}
            >
              {status}
            </div>
          )}
          {statusTag && (
            <div style={{ fontSize: 11.5, color: subtle }}>{statusTag}</div>
          )}
        </div>
      )}
    </SheetRow>
  );
}

export function SheetSearchRow({
  value,
  onChange,
  placeholder = "IconSearch…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <SheetRow>
      <IconSearch stroke={1.5} size={18} color={subtle} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent focus:outline-none"
        style={{ fontFamily: font, fontSize: 16, color: navy }}
      />
    </SheetRow>
  );
}
