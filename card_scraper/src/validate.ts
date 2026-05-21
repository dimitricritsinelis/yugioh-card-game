import { stat } from "node:fs/promises";
import path from "node:path";
import type { CardRecord, FailureReport, Restriction } from "./schema.js";
import { CardRecordSchema } from "./schema.js";
import { detectDuplicateFileNames } from "./normalize.js";

export type ValidationOptions = {
  outDir: string;
  expectedCount?: number | null;
  metadataOnly?: boolean;
  banlistUnmatched?: string[];
};

export type ValidationResult = {
  warnings: string[];
  failures: string[];
  banlistCounts: Record<Restriction, number>;
};

export async function validateCards(cards: CardRecord[], options: ValidationOptions): Promise<ValidationResult> {
  const warnings: string[] = [];
  const failures: string[] = [];
  const banlistCounts: Record<Restriction, number> = { Forbidden: 0, Limited: 0, "Semi-Limited": 0, Unlimited: 0 };

  if (typeof options.expectedCount === "number" && cards.length !== options.expectedCount) {
    failures.push(`Expected ${options.expectedCount} cards, found ${cards.length}`);
  }

  const passcodes = new Map<string, string[]>();
  for (const card of cards) {
    const parsed = CardRecordSchema.safeParse(card);
    if (!parsed.success) failures.push(`${card.name || card.slug}: schema validation failed: ${parsed.error.message}`);
    passcodes.set(card.passcode, [...(passcodes.get(card.passcode) ?? []), card.name]);
    banlistCounts[card.legality.restriction] += 1;

    if (!card.name) failures.push(`${card.slug}: missing name`);
    if (!card.slug) failures.push(`${card.name}: missing slug`);
    if (!card.category) failures.push(`${card.name}: missing category`);
    if (!card.source.detail_url) failures.push(`${card.name}: missing detail_url`);
    if (!card.passcode) failures.push(`${card.name}: missing passcode`);
    if (card.category === "Monster" && !card.monster) failures.push(`${card.name}: monster card missing monster object`);
    if ((card.category === "Spell" || card.category === "Trap") && !card.spell_trap) {
      failures.push(`${card.name}: spell/trap card missing spell_trap object`);
    }
    if (!card.text.trim()) failures.push(`${card.name}: empty card text`);
    checkSuspiciousText(card, warnings);

    if (!options.metadataOnly) {
      if (!card.image.file_path) failures.push(`${card.name}: missing local image path`);
      else {
        try {
          const imageStat = await stat(card.image.file_path);
          if (imageStat.size <= 0) failures.push(`${card.name}: image file is empty`);
        } catch {
          failures.push(`${card.name}: image file missing at ${card.image.file_path}`);
        }
      }
      if (!card.image.byte_size) failures.push(`${card.name}: missing image byte_size`);
      if (!card.image.sha256) failures.push(`${card.name}: missing image sha256`);
    }
  }

  for (const [passcode, names] of passcodes) {
    if (names.length > 1) warnings.push(`Duplicate passcode ${passcode}: ${names.join(" / ")}`);
  }

  for (const duplicate of detectDuplicateFileNames(cards)) failures.push(`Duplicate file name ${duplicate}`);

  for (const unmatched of options.banlistUnmatched ?? []) warnings.push(`Banlist card did not match scraped pool: ${unmatched}`);

  return { warnings, failures, banlistCounts };
}

function checkSuspiciousText(card: CardRecord, warnings: string[]): void {
  const text = card.text;
  const doubleQuotes = (text.match(/"/g) ?? []).length;
  if (doubleQuotes % 2 !== 0) warnings.push(`${card.name}: mismatched double quotes in text`);
  if (/["']$/.test(text.trim()) && doubleQuotes % 2 !== 0) warnings.push(`${card.name}: trailing unmatched quote`);
  if (text.includes("\uFFFD")) warnings.push(`${card.name}: replacement character in text`);
  if (text.trim().length < 8) warnings.push(`${card.name}: very short card text`);
  if (/\s{2,}/.test(text)) warnings.push(`${card.name}: duplicate whitespace in text`);
}

export async function validateOutputFiles(
  outDir: string,
  expectedCount: number | null,
  strict: boolean,
  artifactsDir?: string
): Promise<ValidationResult> {
  const cardsPath = path.join(outDir, "cards.json");
  const content = await import("node:fs/promises").then((fs) => fs.readFile(cardsPath, "utf8"));
  const cards = JSON.parse(content) as CardRecord[];
  const failuresPath = path.join(artifactsDir ?? outDir, "failures.json");
  let failureReport: FailureReport | null = null;
  try {
    failureReport = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(failuresPath, "utf8"))) as FailureReport;
  } catch {
    failureReport = null;
  }
  const result = await validateCards(cards, {
    outDir,
    expectedCount,
    metadataOnly: cards.every((card) => card.image.status === "skipped"),
    banlistUnmatched: failureReport?.unmatched_banlist_cards
  });
  if (failureReport) {
    result.failures.push(...failureReport.detail_scrape_failures.map((failure) => `Detail scrape failed ${failure.url}: ${failure.error}`));
    result.failures.push(...failureReport.parse_failures.map((failure) => `Parse failed ${failure.url}: ${failure.error}`));
    result.failures.push(...failureReport.image_failures.map((failure) => `Image failed ${failure.name}: ${failure.error}`));
  }
  if (result.failures.length || (strict && result.warnings.length)) {
    const details = [...result.failures, ...(strict ? result.warnings : [])].join("\n");
    throw new Error(`Validation failed:\n${details}`);
  }
  return result;
}
