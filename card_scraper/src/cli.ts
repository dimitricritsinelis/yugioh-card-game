#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { ensureDir, fileExists, readCachedHtml, writeCachedHtml } from "./cache.js";
import { downloadCardImage } from "./downloadImage.js";
import { normalizeCardName } from "./normalize.js";
import { buildManifest, buildMarkdownReport, readExistingReportData, writeAllOutputs } from "./report.js";
import { fetchBanlist, parseBanlist } from "./scrapeBanlist.js";
import { scrapeCardDetailUrl } from "./scrapeOne.js";
import { scrapeCardPool } from "./scrapeCardPool.js";
import { parseCardDetail } from "./scrapeCardDetail.js";
import type { CardRecord, FailureReport, Restriction } from "./schema.js";
import { validateCards, validateOutputFiles } from "./validate.js";

const USER_AGENT = "goatworld-card-pool-scraper/0.1 (+https://goatworld.community/wiki/card-pool local prototype; contact: local)";

type CommonOptions = {
  out: string;
  artifacts: string;
  concurrency: string;
  delayMs: string;
  strict?: boolean;
  metadataOnly?: boolean;
  images?: boolean;
  resume?: boolean;
  force?: boolean;
  headless?: string | boolean;
  expectedCount: string;
  limit?: string;
};

const program = new Command();
program.name("goatworld-scraper");

function withCommonOptions(command: Command): Command {
  return command
    .option("--out <dir>", "output directory", "../yugioh_cards")
    .option("--artifacts <dir>", "scraper reports/cache/lookup output directory", "./artifacts/latest")
    .option("--concurrency <n>", "detail page concurrency", "3")
    .option("--delayMs <n>", "polite delay between requests", "500")
    .option("--strict", "fail when validation warnings exist")
    .option("--metadataOnly", "scrape metadata without downloading images")
    .option("--images", "download or redownload images")
    .option("--resume", "skip already successful cards/images")
    .option("--force", "ignore cache and redownload")
    .option("--headless <bool>", "run browser headless", "true")
    .option("--expectedCount <n>", "expected card count, use 0 to disable", "1704")
    .option("--limit <n>", "scrape only the first n discovered cards; intended for sample runs");
}

withCommonOptions(program.command("scrape")).action(async (options: CommonOptions) => {
  await runScrape(parseOptions(options));
});

withCommonOptions(program.command("validate")).action(async (options: CommonOptions) => {
  await validateOutputFiles(path.resolve(options.out), parseExpectedCount(options.expectedCount), Boolean(options.strict), path.resolve(options.artifacts));
  console.log("Validation passed");
});

program
  .command("report")
  .option("--out <dir>", "output directory", "../yugioh_cards")
  .option("--artifacts <dir>", "scraper reports/cache/lookup output directory", "./artifacts/latest")
  .action(async ({ out, artifacts }: { out: string; artifacts: string }) => {
    const outDir = path.resolve(out);
    const artifactsDir = path.resolve(artifacts);
    const { failures, manifest } = await readExistingReportData(outDir, artifactsDir);
    const existingManifest = manifest as ReturnType<typeof buildManifest>;
    const report = buildMarkdownReport({
      manifest: existingManifest,
      failures,
      validationFailures: failures.validation_failures,
      validationWarnings: failures.validation_warnings
    });
    await import("./cache.js").then(({ atomicWriteFile }) => atomicWriteFile(path.join(artifactsDir, "scrape-report.md"), report));
    console.log(path.join(artifactsDir, "scrape-report.md"));
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function parseOptions(options: CommonOptions) {
  return {
    outDir: path.resolve(options.out),
    artifactsDir: path.resolve(options.artifacts),
    concurrency: Math.max(1, Number.parseInt(options.concurrency, 10) || 3),
    delayMs: Math.max(0, Number.parseInt(options.delayMs, 10) || 500),
    strict: Boolean(options.strict),
    metadataOnly: Boolean(options.metadataOnly),
    images: Boolean(options.images),
    resume: Boolean(options.resume),
    force: Boolean(options.force),
    headless: options.headless === true || String(options.headless).toLowerCase() !== "false",
    expectedCount: parseExpectedCount(options.expectedCount),
    limit: options.limit ? Number.parseInt(options.limit, 10) : null
  };
}

function parseExpectedCount(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
}

async function runScrape(options: ReturnType<typeof parseOptions>): Promise<void> {
  await ensureDir(options.outDir);
  await ensureDir(options.artifactsDir);
  const scrapedAt = new Date().toISOString();
  const failures: FailureReport = {
    detail_scrape_failures: [],
    parse_failures: [],
    image_failures: [],
    validation_failures: [],
    validation_warnings: [],
    unmatched_banlist_cards: []
  };

  const pool = await scrapeCardPool({
    headless: options.headless,
    expectedCount: options.limit ? options.limit : options.expectedCount,
    limit: options.limit,
    userAgent: USER_AGENT,
    strict: options.strict && !options.limit
  });
  console.log(`network hints found: ${pool.networkHints.length}`);

  const banlistHtml = await fetchBanlist(USER_AGENT);
  const preliminaryCards = await scrapeDetails(pool.urls, options, scrapedAt, failures, new Map());
  const banlist = parseBanlist(banlistHtml, preliminaryCards.map((card) => card.name));
  failures.unmatched_banlist_cards = options.limit ? [] : banlist.unmatched;

  const restrictions = banlist.restrictionsByName;
  let cards = preliminaryCards.map((card) => {
    const restriction = restrictions.get(normalizeCardName(card.name)) ?? "Unlimited";
    return {
      ...card,
      legality: {
        goat_world_pool: true,
        restriction,
        max_copies: restriction === "Forbidden" ? 0 : restriction === "Limited" ? 1 : restriction === "Semi-Limited" ? 2 : 3
      }
    } as CardRecord;
  });

  if (!options.metadataOnly || options.images) {
    cards = await mapWithConcurrency(cards, Math.min(options.concurrency, 3), async (card) => {
      if (options.resume && !options.force) {
        const target = path.join(options.outDir, "images", card.file_name);
        if (await fileExists(target)) return downloadCardImage(card, { outDir: options.outDir, force: false, userAgent: USER_AGENT });
      }
      await politeDelay(options.delayMs);
      const downloaded = await downloadCardImage(card, { outDir: options.outDir, force: options.force, userAgent: USER_AGENT });
      if (downloaded.image.status === "failed") {
        failures.image_failures.push({
          passcode: downloaded.passcode,
          name: downloaded.name,
          file_name: downloaded.file_name,
          error: downloaded.image.error ?? "unknown image error"
        });
      }
      return downloaded;
    });
  }

  const validation = await validateCards(cards, {
    outDir: options.outDir,
    expectedCount: options.limit ? options.limit : options.expectedCount,
    metadataOnly: options.metadataOnly && !options.images,
    banlistUnmatched: options.limit ? [] : banlist.unmatched
  });
  failures.validation_failures = validation.failures;
  failures.validation_warnings = validation.warnings;

  const manifest = buildManifest({
    scrapedAt,
    expectedCount: options.limit ? options.limit : options.expectedCount,
    cards,
    failures,
    banlistCounts: banlist.counts
  });
  const report = buildMarkdownReport({
    manifest,
    failures,
    validationWarnings: validation.warnings,
    validationFailures: validation.failures
  });
  await writeAllOutputs(options.outDir, options.artifactsDir, cards, manifest, failures, report);

  if (validation.failures.length || (options.strict && validation.warnings.length)) {
    throw new Error(`Scrape completed with validation issues. See ${path.join(options.artifactsDir, "scrape-report.md")}`);
  }
  console.log(`Wrote ${cards.length} cards to ${options.outDir}`);
}

async function scrapeDetails(
  urls: string[],
  options: ReturnType<typeof parseOptions>,
  scrapedAt: string,
  failures: FailureReport,
  restrictions: Map<string, Restriction>
): Promise<CardRecord[]> {
  return (
    await mapWithConcurrency(urls, options.concurrency, async (url) => {
      await politeDelay(options.delayMs);
      try {
        let html = options.force ? null : await readCachedHtml(options.artifactsDir, url);
        if (!html) html = await scrapeCardDetailUrl(url, USER_AGENT, options.headless);
        const cachePath = await writeCachedHtml(options.artifactsDir, url, html);
        try {
          return parseCardDetail({
            html,
            detailUrl: url,
            scrapedAt,
            rawHtmlCachePath: cachePath,
            restriction: restrictions.get(normalizeCardName(url))
          });
        } catch (error) {
          failures.parse_failures.push({ url, error: error instanceof Error ? error.message : String(error) });
          return null;
        }
      } catch (error) {
        failures.detail_scrape_failures.push({ url, error: error instanceof Error ? error.message : String(error) });
        return null;
      }
    })
  ).filter((card): card is CardRecord => card !== null);
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) break;
      output[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return output;
}

async function politeDelay(delayMs: number): Promise<void> {
  if (!delayMs) return;
  const jitter = Math.floor(Math.random() * Math.max(1, delayMs * 0.25));
  await new Promise((resolve) => setTimeout(resolve, delayMs + jitter));
}
