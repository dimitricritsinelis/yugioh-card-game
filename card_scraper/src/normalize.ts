import type { CardRecord } from "./schema.js";

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeCardName(value: string): string {
  return collapseWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u2018\u2019\u201A\u201B`]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugifyCardName(value: string): string {
  return collapseWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201A\u201B'`]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cardSlugFromUrl(url: string): string {
  const parsed = new URL(url, "https://goatworld.community");
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function deterministicFileName(passcode: string, name: string): string {
  return `${passcode}_${slugifyCardName(name)}.webp`;
}

export function parseInteger(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d-]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function detectDuplicateFileNames(cards: Pick<CardRecord, "file_name" | "name">[]): string[] {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const card of cards) {
    const previous = seen.get(card.file_name);
    if (previous) duplicates.push(`${card.file_name}: ${previous} / ${card.name}`);
    seen.set(card.file_name, card.name);
  }
  return duplicates;
}

export function resolveImageCandidates(sourceSrc: string | null, passcode: string, origin = "https://goatworld.community"): string[] {
  const candidates: string[] = [];
  const add = (value: string | null | undefined) => {
    if (!value) return;
    try {
      const resolved = new URL(value, origin).toString();
      if (!candidates.includes(resolved)) candidates.push(resolved);
    } catch {
      // Ignore malformed image candidates; later candidates may still succeed.
    }
  };

  add(sourceSrc);
  if (sourceSrc) {
    try {
      const parsed = new URL(sourceSrc, origin);
      const decoded = parsed.searchParams.get("url");
      if (decoded) add(decoded);
    } catch {
      // Fallback candidates below are still valid.
    }
  }

  add(`/goat-db/${passcode}.webp`);
  if (/^0+\d+$/.test(passcode)) add(`/goat-db/${Number(passcode)}.webp`);
  return candidates;
}

export function restrictionToMaxCopies(restriction: string): 0 | 1 | 2 | 3 {
  if (restriction === "Forbidden") return 0;
  if (restriction === "Limited") return 1;
  if (restriction === "Semi-Limited") return 2;
  return 3;
}
