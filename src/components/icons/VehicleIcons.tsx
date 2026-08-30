/**
 * Top-down vehicle icons for PRO Teach Map Draw.
 *
 * Each vehicle is defined once as an SVG markup string so the exact same
 * artwork can be used three ways:
 *   - React pills in the toolbar
 *   - absolutely-positioned markers on the map overlay
 *   - rasterised onto the export canvas when sharing/saving
 */

export type VehicleType =
  | "car-blue"
  | "car-yellow"
  | "car-green"
  | "car-red"
  | "van"
  | "lorry"
  | "bus"
  | "motorbike"
  | "bicycle";

export const VEHICLE_TYPES: VehicleType[] = [
  "car-blue",
  "car-yellow",
  "car-green",
  "car-red",
  "van",
  "lorry",
  "bus",
  "motorbike",
  "bicycle",
];

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  "car-blue": "Blue car",
  "car-yellow": "Yellow car",
  "car-green": "Green car",
  "car-red": "Red car",
  van: "Van",
  lorry: "Lorry",
  bus: "Bus",
  motorbike: "Motorbike",
  bicycle: "Bicycle",
};

const BODY_COLOUR: Record<VehicleType, string> = {
  "car-blue": "#1877D6",
  "car-yellow": "#F2B807",
  "car-green": "#2E9E5B",
  "car-red": "#CC2229",
  van: "#8A94A6",
  lorry: "#0B1F3A",
  bus: "#E4572E",
  motorbike: "#3D3D46",
  bicycle: "#18A999",
};

const GLASS = "#DCEAF7";
const OUTLINE = "rgba(11,31,58,0.55)";

/** Body shapes are drawn nose-up inside a 40x40 box. */
function shape(type: VehicleType, body: string): string {
  switch (type) {
    case "van":
      return `
        <rect x="10" y="5" width="20" height="31" rx="4" fill="${body}" stroke="${OUTLINE}" stroke-width="1.2"/>
        <path d="M13 10h14v5H13z" fill="${GLASS}"/>
        <rect x="12" y="19" width="16" height="13" rx="2" fill="rgba(255,255,255,0.18)"/>
        <circle cx="14" cy="8" r="1.3" fill="#FFF3C4"/>
        <circle cx="26" cy="8" r="1.3" fill="#FFF3C4"/>`;
    case "lorry":
      return `
        <rect x="9" y="3" width="22" height="12" rx="3" fill="${body}" stroke="${OUTLINE}" stroke-width="1.2"/>
        <path d="M12 6.5h16v4.5H12z" fill="${GLASS}"/>
        <rect x="10" y="15" width="20" height="22" rx="2" fill="#E7ECF3" stroke="${OUTLINE}" stroke-width="1.2"/>
        <path d="M10 24h20" stroke="rgba(11,31,58,0.25)" stroke-width="1"/>`;
    case "bus":
      return `
        <rect x="10" y="3" width="20" height="34" rx="4" fill="${body}" stroke="${OUTLINE}" stroke-width="1.2"/>
        <path d="M13 7h14v5H13z" fill="${GLASS}"/>
        <path d="M10 18h20M10 26h20" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>`;
    case "motorbike":
      return `
        <rect x="17" y="6" width="6" height="28" rx="3" fill="${body}" stroke="${OUTLINE}" stroke-width="1.2"/>
        <path d="M13 14h14" stroke="${body}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="20" cy="9" r="2.4" fill="${GLASS}"/>`;
    case "bicycle":
      return `
        <circle cx="20" cy="10" r="5" fill="none" stroke="${body}" stroke-width="2"/>
        <circle cx="20" cy="30" r="5" fill="none" stroke="${body}" stroke-width="2"/>
        <path d="M20 15v10" stroke="${body}" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 17h12" stroke="${body}" stroke-width="2" stroke-linecap="round"/>`;
    default:
      // saloon car
      return `
        <path d="M20 3c5 0 8 5 8.4 11l.6 12c.2 5-3.4 11-9 11s-9.2-6-9-11l.6-12C12 8 15 3 20 3z"
              fill="${body}" stroke="${OUTLINE}" stroke-width="1.2"/>
        <path d="M15 11c1.4-2.6 8.6-2.6 10 0l1 3.5H14z" fill="${GLASS}"/>
        <path d="M14.5 22h11v6.5c0 1-1 1.5-5.5 1.5s-5.5-.5-5.5-1.5z" fill="${GLASS}" opacity="0.85"/>
        <circle cx="15" cy="6.6" r="1.3" fill="#FFF3C4"/>
        <circle cx="25" cy="6.6" r="1.3" fill="#FFF3C4"/>
        <rect x="9.6" y="16" width="2.6" height="4" rx="1.2" fill="${body}" stroke="${OUTLINE}" stroke-width="0.8"/>
        <rect x="27.8" y="16" width="2.6" height="4" rx="1.2" fill="${body}" stroke="${OUTLINE}" stroke-width="0.8"/>`;
  }
}

export function isVehicleType(type: string): type is VehicleType {
  return (VEHICLE_TYPES as string[]).includes(type);
}

/** Full standalone SVG markup for a vehicle, sized in CSS pixels. */
export function vehicleSvgMarkup(type: VehicleType, size = 34): string {
  const body = BODY_COLOUR[type] ?? BODY_COLOUR["car-blue"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">${shape(
    type,
    body,
  )}</svg>`;
}

export function vehicleDataUrl(type: VehicleType, size = 34): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vehicleSvgMarkup(type, size))}`;
}

export function VehicleIcon({
  type,
  size = 34,
  className,
}: {
  type: VehicleType;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      aria-hidden
      style={{ display: "inline-flex", width: size, height: size, lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: vehicleSvgMarkup(type, size) }}
    />
  );
}
