import { getPlatform } from "./platform";

/**
 * Storage / file abstraction.
 *
 * Uses browser downloads, the Web Share API and the clipboard today, and is
 * ready to swap in Capacitor's native filesystem and share sheet later.
 */

// Save a file — opens browser download in web, saves to device in Capacitor
export async function saveFile(
  filename: string,
  content: string | Blob,
  mimeType: string = "text/plain",
): Promise<void> {
  const platform = getPlatform();

  if (platform === "capacitor") {
    // TODO: Capacitor filesystem
    // import { Filesystem, Directory } from '@capacitor/filesystem';
    // await Filesystem.writeFile({
    //   path: filename,
    //   data: content as string,
    //   directory: Directory.Documents,
    // });
    console.log("[storage] Capacitor filesystem — not yet implemented");
    return;
  }

  // Web — trigger browser download
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Share content — uses Web Share API on web, native share on Capacitor
export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<void> {
  const platform = getPlatform();

  if (platform === "capacitor") {
    // TODO: Capacitor share
    // import { Share } from '@capacitor/share';
    // await Share.share(options);
    console.log("[storage] Capacitor share — not yet implemented");
    return;
  }

  // Web Share API
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share(options);
    return;
  }

  // Fallback — copy URL to clipboard
  if (options.url) {
    await navigator.clipboard.writeText(options.url);
  }
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    return true;
  }
}
