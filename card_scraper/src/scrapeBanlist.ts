import * as cheerio from "cheerio";
import type { Banlist, Restriction } from "./schema.js";
import { normalizeCardName, collapseWhitespace } from "./normalize.js";

const BANLIST_URL = "https://goatworld.community/wiki/banlist";

function extractJsonArrayByKey(html: string, key: string): unknown[] | null {
  const marker = `"${key}":[`;
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const arrayStart = start + `"${key}":`.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = arrayStart; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        const json = html.slice(arrayStart, i + 1);
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function namesFromNextData(html: string): Record<Exclude<Restriction, "Unlimited">, string[]> | null {
  const decodedHtml = html.replace(/\\"/g, '"').replace(/\\n/g, "\n");
  const forbidden = extractJsonArrayByKey(decodedHtml, "forbidden");
  const limited = extractJsonArrayByKey(decodedHtml, "limited");
  const semiLimited = extractJsonArrayByKey(decodedHtml, "semiLimited");
  if (!forbidden || !limited || !semiLimited) return null;

  const readNames = (items: unknown[]) =>
    items.flatMap((item) => {
      if (item && typeof item === "object" && "name" in item && typeof item.name === "string") return [item.name];
      return [];
    });

  return {
    Forbidden: readNames(forbidden),
    Limited: readNames(limited),
    "Semi-Limited": readNames(semiLimited)
  };
}

function namesFromDom(html: string): Record<Exclude<Restriction, "Unlimited">, string[]> {
  const $ = cheerio.load(html);
  const output: Record<Exclude<Restriction, "Unlimited">, string[]> = {
    Forbidden: [],
    Limited: [],
    "Semi-Limited": []
  };
  const headings: Array<[Exclude<Restriction, "Unlimited">, RegExp]> = [
    ["Forbidden", /forbidden/i],
    ["Limited", /^limited/i],
    ["Semi-Limited", /semi.?limited/i]
  ];
  for (const [restriction, matcher] of headings) {
    const heading = $("h2,h3").filter((_, el) => matcher.test(collapseWhitespace($(el).text()))).first();
    if (!heading.length) continue;
    const sectionText = heading.nextUntil("h2,h3").text();
    output[restriction] = sectionText
      .split(/\n|•|,/)
      .map(collapseWhitespace)
      .filter((value) => value.length > 1);
  }
  return output;
}

export function parseBanlist(html: string, scrapedCardNames: string[] = []): Banlist {
  const rawNames = namesFromNextData(html) ?? namesFromDom(html);
  const restrictionsByName = new Map<string, Restriction>();
  for (const [restriction, names] of Object.entries(rawNames) as Array<[Exclude<Restriction, "Unlimited">, string[]]>) {
    for (const name of names) restrictionsByName.set(normalizeCardName(name), restriction);
  }

  const scrapedLookup = new Set(scrapedCardNames.map(normalizeCardName));
  const unmatched = scrapedCardNames.length
    ? [...restrictionsByName.entries()].filter(([name]) => !scrapedLookup.has(name)).map(([name]) => name)
    : [];

  return {
    restrictionsByName,
    unmatched,
    counts: {
      Forbidden: rawNames.Forbidden.length,
      Limited: rawNames.Limited.length,
      "Semi-Limited": rawNames["Semi-Limited"].length,
      Unlimited: 0
    },
    sourceUrl: BANLIST_URL,
    rawNames
  };
}

export async function fetchBanlist(userAgent: string): Promise<string> {
  const response = await fetch(BANLIST_URL, { headers: { "user-agent": userAgent } });
  if (!response.ok) throw new Error(`Banlist request failed: ${response.status} ${response.statusText}`);
  return response.text();
}
