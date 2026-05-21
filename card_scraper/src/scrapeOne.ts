import { chromium } from "playwright";

export async function scrapeCardDetailUrl(url: string, userAgent: string, headless: boolean): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": userAgent } });
  if (response.ok) return response.text();

  const browser = await chromium.launch({ headless });
  try {
    const context = await browser.newContext({ userAgent });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}
