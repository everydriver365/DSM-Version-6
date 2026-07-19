import { useState } from "react";

const PUPIL_PALETTE = [
  "#1877D6",
  "#6B4FD6",
  "#3B6D11",
  "#C4501E",
  "#0C8577",
  "#CC2229",
  "#854F0B",
  "#185F8A",
];

const PUPIL_COLOUR_OVERRIDES: Record<string, string> = {
  "joseph thorne": "#3B6D11",
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pupilColour(
  pupilId?: string | null,
  fallback?: string | null,
  name?: string | null,
): string {
  const key = (name ?? "").trim().toLowerCase();
  if (key && PUPIL_COLOUR_OVERRIDES[key]) return PUPIL_COLOUR_OVERRIDES[key];
  if (fallback && /^#[0-9a-fA-F]{3,8}$/.test(fallback)) return fallback;
  if (!pupilId) return PUPIL_PALETTE[0];
  return PUPIL_PALETTE[hashString(pupilId) % PUPIL_PALETTE.length];
}

export interface PupilAvatarProps {
  // Relaxed shape so it works with both schedule and home lesson joins.
  pupil: {
    id?: string | null;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    calendar_colour?: string | null;
    profile_image_url?: string | null;
    photo_url?: string | null;
  } | null;
  pupilId?: string | null;
  size?: number;
  className?: string;
}

export function getInitials(pupil: PupilAvatarProps["pupil"]): string {
  if (!pupil) return "?";
  const { name, first_name, last_name } = pupil;
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  }
  const first = first_name?.trim()?.[0] ?? "";
  const last = last_name?.trim()?.[0] ?? "";
  return (first + last).toUpperCase() || (first_name?.slice(0, 2).toUpperCase() ?? "?");
}

export function PupilAvatar({ pupil, pupilId, size = 32, className }: PupilAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const name =
    pupil?.name ||
    `${pupil?.first_name ?? ""} ${pupil?.last_name ?? ""}`.trim() ||
    null;
  const colour = pupilColour(pupilId ?? pupil?.id ?? null, pupil?.calendar_colour ?? null, name);
  const imageUrl = pupil?.profile_image_url || pupil?.photo_url || null;
  const initials = getInitials(pupil);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colour,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.round(size * 0.375)),
        fontWeight: 700,
        flexShrink: 0,
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
      }}
    >
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
