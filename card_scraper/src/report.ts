import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CardRecord, FailureReport, Restriction } from "./schema.js";
import { atomicWriteFile } from "./cache.js";

export function buildDictionaries(cards: CardRecord[]) {
  return {
    byFile: Object.fromEntries(cards.map((card) => [card.file_name, card])),
    byPasscode: Object.fromEntries(cards.map((card) => [card.passcode, card])),
    bySlug: Object.fromEntries(cards.map((card) => [card.slug, card])),
    fileToCardName: Object.fromEntries(cards.map((card) => [card.file_name, card.name]))
  };
}

export function cardsToCsv(cards: CardRecord[]): string {
  const headers = [
    "name",
    "passcode",
    "file_name",
    "category",
    "restriction",
    "max_copies",
    "atk",
    "def",
    "level",
    "attribute",
    "type",
    "icon",
    "text"
  ];
  const rows = cards.map((card) => [
    card.name,
    card.passcode,
    card.file_name,
    card.category,
    card.legality.restriction,
    String(card.legality.max_copies),
    card.monster?.atk?.toString() ?? "",
    card.monster?.def?.toString() ?? "",
    card.monster?.level?.toString() ?? "",
    card.monster?.attribute ?? "",
    card.monster?.type ?? "",
    card.spell_trap?.icon ?? "",
    card.text
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildManifest(args: {
  scrapedAt: string;
  expectedCount: number | null;
  cards: CardRecord[];
  failures: FailureReport;
  banlistCounts: Record<Restriction, number>;
}) {
  return {
    scraped_at: args.scrapedAt,
    source_urls: {
      card_pool: "https://goatworld.community/wiki/card-pool",
      banlist: "https://goatworld.community/wiki/banlist"
    },
    expected_count: args.expectedCount,
    actual_count: args.cards.length,
    image_count: args.cards.filter((card) => card.image.status === "downloaded" || card.image.status === "cached").length,
    failed_image_count: args.failures.image_failures.length,
    banlist_counts: args.banlistCounts,
    code_version: process.env.npm_package_version ?? null
  };
}

export function buildMarkdownReport(args: {
  manifest: ReturnType<typeof buildManifest>;
  failures: FailureReport;
  validationWarnings: string[];
  validationFailures: string[];
}): string {
  return [
    "# Goat World Scrape Report",
    "",
    `- Scraped at: ${args.manifest.scraped_at}`,
    `- Expected cards: ${args.manifest.expected_count ?? "disabled"}`,
    `- Actual cards: ${args.manifest.actual_count}`,
    `- Downloaded/cached images: ${args.manifest.image_count}`,
    `- Failed images: ${args.manifest.failed_image_count}`,
    `- Banlist Forbidden: ${args.manifest.banlist_counts.Forbidden}`,
    `- Banlist Limited: ${args.manifest.banlist_counts.Limited}`,
    `- Banlist Semi-Limited: ${args.manifest.banlist_counts["Semi-Limited"]}`,
    "",
    "## Failures",
    "",
    `- Detail scrape failures: ${args.failures.detail_scrape_failures.length}`,
    `- Parse failures: ${args.failures.parse_failures.length}`,
    `- Image failures: ${args.failures.image_failures.length}`,
    `- Validation failures: ${args.validationFailures.length}`,
    "",
    "## Warnings",
    "",
    ...(args.validationWarnings.length ? args.validationWarnings.map((warning) => `- ${warning}`) : ["- None"]),
    ""
  ].join("\n");
}

export async function writeAllOutputs(
  outDir: string,
  artifactsDir: string,
  cards: CardRecord[],
  manifest: object,
  failures: FailureReport,
  reportMarkdown: string
): Promise<void> {
  const dictionaries = buildDictionaries(cards);
  await atomicWriteFile(path.join(outDir, "cards.json"), JSON.stringify(cards, null, 2));
  await atomicWriteFile(path.join(artifactsDir, "cards.by_file.json"), JSON.stringify(dictionaries.byFile, null, 2));
  await atomicWriteFile(path.join(artifactsDir, "cards.by_passcode.json"), JSON.stringify(dictionaries.byPasscode, null, 2));
  await atomicWriteFile(path.join(artifactsDir, "cards.by_slug.json"), JSON.stringify(dictionaries.bySlug, null, 2));
  await atomicWriteFile(path.join(artifactsDir, "file_to_card_name.json"), JSON.stringify(dictionaries.fileToCardName, null, 2));
  await atomicWriteFile(path.join(artifactsDir, "cards.csv"), cardsToCsv(cards));
  await atomicWriteFile(path.join(artifactsDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await atomicWriteFile(path.join(artifactsDir, "failures.json"), JSON.stringify(failures, null, 2));
  await atomicWriteFile(path.join(artifactsDir, "scrape-report.md"), reportMarkdown);
}

export async function readExistingReportData(
  outDir: string,
  artifactsDir: string
): Promise<{ cards: CardRecord[]; failures: FailureReport; manifest: object }> {
  const [cards, failures, manifest] = await Promise.all([
    readFile(path.join(outDir, "cards.json"), "utf8").then((value) => JSON.parse(value) as CardRecord[]),
    readFile(path.join(artifactsDir, "failures.json"), "utf8").then((value) => JSON.parse(value) as FailureReport),
    readFile(path.join(artifactsDir, "manifest.json"), "utf8").then((value) => JSON.parse(value) as object)
  ]);
  return { cards, failures, manifest };
}
