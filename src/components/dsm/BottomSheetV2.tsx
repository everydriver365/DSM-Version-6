import React from "react";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// DSM DESIGN TOKENS
// ---------------------------------------------------------------------------
const navy = "#0B1F3A";
const blue = "#1877D6";
const red = "#CC2229";
const canvas = "#EEF2F7";
const cardShadow = "0 1px 3px rgba(0,0,0,0.06)";
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
          <div className="flex items-center justify-between">
            <div>
              {subtitle && (
                <div
                  className="text-xs font-medium tracking-wide"
                  style={{ color: "#8A93A3" }}
                >
                  {subtitle}
                </div>
              )}
              <h2
                className="text-xl font-semibold mt-0.5"
                style={{ color: navy }}
              >
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full active:bg-black/5"
              aria-label="Close"
              type="button"
            >
              <X size={20} color="#8A93A3" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-2 flex-1">{children}</div>

        {footer && (
          <div
            className="px-4 pt-3 pb-6 shrink-0"
            style={{ borderTop: "1px solid #E3E7ED" }}
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
      className="w-full py-4 rounded-full text-white font-semibold text-base active:opacity-90 disabled:opacity-40"
      style={{ backgroundColor: color }}
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
      className="w-full py-3 rounded-full font-medium text-base mt-2"
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </button>
  );
}
