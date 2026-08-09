export function decodeHtmlEntities(raw: string | null | undefined): string {
  if (!raw) return "";

  return raw
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_, decimal) => {
      const code = parseInt(decimal, 10);
      return isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function sanitizeNewsTitle(raw: string | null | undefined): string {
  if (!raw) return "";

  return decodeHtmlEntities(raw)
    .replace(/<[^>]*>/g, " ") // strip HTML tags
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

export function sanitizeNewsContent(raw: string | null | undefined): string {
  if (!raw) return "";

  return decodeHtmlEntities(raw)
    .replace(/<[^>]*>/g, " ") // strip HTML tags
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
