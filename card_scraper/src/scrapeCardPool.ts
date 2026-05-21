import { chromium, type Browser, type Page } from "playwright";

export type PoolScrapeOptions = {
  headless: boolean;
  expectedCount: number | null;
  limit?: number | null;
  userAgent: string;
  strict: boolean;
};

export type PoolScrapeResult = {
  urls: string[];
  pageCounts: Array<{ page: number; count: number }>;
  robotsText: string | null;
  networkHints: string[];
};

const CARD_POOL_URL = "https://goatworld.community/wiki/card-pool";

export async function scrapeCardPool(options: PoolScrapeOptions): Promise<PoolScrapeResult> {
  const robotsText = await fetchRobots(options.userAgent);
  if (robotsText && isDisallowedByRobots(robotsText, "/wiki/card-pool")) {
    throw new Error("robots.txt disallows /wiki/card-pool for this user agent");
  }

  const browser = await chromium.launch({ headless: options.headless });
  try {
    const context = await browser.newContext({ userAgent: options.userAgent });
    const page = await context.newPage();
    const networkHints: string[] = [];
    page.on("response", (response) => {
      const url = response.url();
      const contentType = response.headers()["content-type"] ?? "";
      if (/json|rsc|flight/i.test(contentType) || /\/api\/|_rsc=/.test(url)) networkHints.push(`${response.status()} ${contentType} ${url}`);
    });
    await page.goto(CARD_POOL_URL, { waitUntil: "networkidle", timeout: 60_000 });
    return await collectPaginatedLinks(page, options, robotsText, networkHints);
  } finally {
    await closeBrowser(browser);
  }
}

async function collectPaginatedLinks(
  page: Page,
  options: PoolScrapeOptions,
  robotsText: string | null,
  networkHints: string[]
): Promise<PoolScrapeResult> {
  const seen = new Set<string>();
  const pageCounts: Array<{ page: number; count: number }> = [];
  let pageNumber = 1;

  for (;;) {
    await page.waitForSelector('main a[href^="/cards/"]', { timeout: 30_000 });
    const links = await visibleCardLinks(page);
    for (const href of links) seen.add(new URL(href, CARD_POOL_URL).toString());
    pageCounts.push({ page: pageNumber, count: links.length });
    console.log(`card-pool page ${pageNumber}: ${links.length} visible card links, ${seen.size} unique total`);
    if (options.limit && seen.size >= options.limit) break;

    const before = links.join("|");
    const next = await findNextButton(page);
    if (!next) break;
    const disabled = await next.evaluate((el) => el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true");
    if (disabled) break;
    await next.click();
    await page.waitForFunction(
      (previous) =>
        [...document.querySelectorAll('main a[href^="/cards/"]')]
          .filter((el) => {
            const rect = (el as HTMLElement).getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((el) => (el as HTMLAnchorElement).href)
          .join("|") !== previous,
      before,
      { timeout: 30_000 }
    );
    pageNumber += 1;
  }

  const urls = [...seen].slice(0, options.limit ?? undefined);
  if (options.expectedCount !== null && !options.limit && urls.length !== options.expectedCount) {
    const message = `Expected ${options.expectedCount} unique card URLs, discovered ${urls.length}`;
    if (options.strict) throw new Error(message);
    console.warn(message);
  }
  return { urls, pageCounts, robotsText, networkHints };
}

async function visibleCardLinks(page: Page): Promise<string[]> {
  return page.$$eval('main a[href^="/cards/"]', (anchors) => {
    const links = anchors
      .filter((anchor) => {
        const rect = (anchor as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((anchor) => (anchor as HTMLAnchorElement).href);
    return [...new Set(links)];
  });
}

async function findNextButton(page: Page) {
  const candidates = page.getByRole("button", { name: /next/i });
  if ((await candidates.count()) > 0) return candidates.first();
  const linkCandidates = page.getByRole("link", { name: /next/i });
  if ((await linkCandidates.count()) > 0) return linkCandidates.first();
  return null;
}

async function fetchRobots(userAgent: string): Promise<string | null> {
  try {
    const response = await fetch("https://goatworld.community/robots.txt", { headers: { "user-agent": userAgent } });
    const text = await response.text();
    console.log(`robots.txt: ${response.status} ${response.statusText}`);
    console.log(text.split("\n").slice(0, 8).join("\n"));
    return text;
  } catch (error) {
    console.warn(`robots.txt fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function isDisallowedByRobots(robotsText: string, pathname: string): boolean {
  const globalBlock = robotsText.split(/\n\s*\n/).find((block) => /^User-Agent:\s*\*/im.test(block));
  if (!globalBlock) return false;
  const disallowed = [...globalBlock.matchAll(/^Disallow:\s*(\S+)/gim)].map((match) => match[1]);
  return disallowed.some((rule) => rule !== "/" && pathname.startsWith(rule));
}

async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
  } catch {
    // Browser is already gone.
  }
}
