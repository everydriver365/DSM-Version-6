// Google Calendar event colour palette.
// Google stores an event's colour as a numeric `colorId` (1-11). When those
// events are imported into `calendar_blocks.colour` we may get either the raw
// id or an already-resolved hex, so `resolveEventColour` accepts both.

export const GOOGLE_DEFAULT_EVENT_COLOUR = "#4AABDB";

export const GOOGLE_EVENT_COLOURS: Record<string, string> = {
  "1": "#7986CB", // Lavender
  "2": "#33B679", // Sage
  "3": "#8E24AA", // Grape
  "4": "#E67C73", // Flamingo
  "5": "#F6BF26", // Banana
  "6": "#F4511E", // Tangerine
  "7": "#039BE5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3F51B5", // Blueberry
  "10": "#0B8043", // Basil
  "11": "#D50000", // Tomato
};

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/**
 * Turns a stored calendar colour (Google colorId or hex) into a hex value.
 * Falls back to the DSM blue used for imported events.
 */
export function resolveEventColour(
  value?: string | number | null,
  fallback: string = GOOGLE_DEFAULT_EVENT_COLOUR,
): string {
  if (value === null || value === undefined) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (HEX.test(raw)) return raw;
  return GOOGLE_EVENT_COLOURS[raw] ?? fallback;
}
