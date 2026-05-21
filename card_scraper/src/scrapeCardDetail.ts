import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { CardRecordSchema, type CardRecord, type Restriction } from "./schema.js";
import {
  cardSlugFromUrl,
  collapseWhitespace,
  deterministicFileName,
  parseInteger,
  resolveImageCandidates,
  restrictionToMaxCopies
} from "./normalize.js";

const CARD_POOL_URL = "https://goatworld.community/wiki/card-pool";
const SITE = "goatworld.community" as const;

export type ParsedCardInput = {
  html: string;
  detailUrl: string;
  scrapedAt: string;
  rawHtmlCachePath: string | null;
  restriction?: Restriction;
};

function valueAfterHeading($: CheerioAPI, headingText: string): string {
  const heading = $("h2,h3").filter((_, el) => collapseWhitespace($(el).text()).toLowerCase() === headingText.toLowerCase()).first();
  if (!heading.length) return "";
  const block = heading.parent();
  const clone = block.clone();
  clone.find("h2,h3").remove();
  return collapseWhitespace(clone.text());
}

function parseStats($: CheerioAPI): Map<string, string> {
  const stats = new Map<string, string>();
  $("h2,h3")
    .filter((_, el) => /card stats/i.test($(el).text()))
    .first()
    .parent()
    .find("div")
    .each((_, row) => {
      const spans = $(row).find("span");
      if (spans.length >= 2) {
        const key = collapseWhitespace($(spans[0]).text());
        const value = collapseWhitespace($(spans[1]).text()).replace(/^★\s*/, "");
        if (key && value) stats.set(key, value);
      }
    });

  if (!stats.size) {
    const bodyText = $("body").text();
    for (const key of ["Passcode", "Category", "Attribute", "Type", "Level", "ATK", "DEF", "Icon"]) {
      const match = bodyText.match(new RegExp(`${key}\\s+([^\\n\\r]+)`, "i"));
      if (match?.[1]) stats.set(key, collapseWhitespace(match[1]));
    }
  }

  return stats;
}

function extractCardImageSrc($: CheerioAPI, name: string): string | null {
  const byAlt = $("img")
    .filter((_, img) => collapseWhitespace($(img).attr("alt") ?? "") === name)
    .first();
  const img = byAlt.length ? byAlt : $("main img").first();
  return img.attr("src") ?? img.attr("srcset")?.split(/\s+/)[0] ?? $('meta[property="og:image"]').attr("content") ?? null;
}

function extractClassifications($: CheerioAPI, category: string, stats: Map<string, string>): string[] {
  if (category !== "Monster") {
    const icon = stats.get("Icon");
    return icon ? [icon] : [];
  }

  const knownClassifications = new Set([
    "Normal",
    "Effect",
    "Fusion",
    "Ritual",
    "Spirit",
    "Union",
    "Toon",
    "Gemini",
    "Tuner",
    "Flip"
  ]);
  const chips = $("main span")
    .map((_, el) => collapseWhitespace($(el).text()))
    .get()
    .filter((value) => knownClassifications.has(value));
  return [...new Set(chips)];
}

function extractRelatedCards($: CheerioAPI): string[] {
  const relatedHeading = $("h2,h3").filter((_, el) => /related cards/i.test($(el).text())).first();
  if (!relatedHeading.length) return [];
  return relatedHeading
    .nextAll("div")
    .first()
    .find("a[href^='/cards/']")
    .map((_, el) => collapseWhitespace($(el).text()))
    .get()
    .filter(Boolean);
}

export function parseCardDetail(input: ParsedCardInput): CardRecord {
  const $ = cheerio.load(input.html);
  const stats = parseStats($);
  const name = collapseWhitespace($("h1").first().text() || $('meta[property="og:title"]').attr("content") || "");
  const passcode = stats.get("Passcode") ?? "";
  const category = stats.get("Category") as CardRecord["category"];
  const slug = cardSlugFromUrl(input.detailUrl) || slugFromCanonical($);
  const fileName = deterministicFileName(passcode, name);
  const restriction = input.restriction ?? "Unlimited";
  const sourceSrc = extractCardImageSrc($, name);
  const text = valueAfterHeading($, "Card Text");
  const classifications = extractClassifications($, category, stats);

  const record: CardRecord = {
    id: passcode,
    passcode,
    slug,
    name,
    file_name: fileName,
    category,
    classifications,
    text,
    monster:
      category === "Monster"
        ? {
            attribute: stats.get("Attribute") ?? null,
            type: stats.get("Type") ?? null,
            level: parseInteger(stats.get("Level")),
            atk: parseInteger(stats.get("ATK")),
            def: parseInteger(stats.get("DEF"))
          }
        : null,
    spell_trap: category === "Spell" || category === "Trap" ? { icon: stats.get("Icon") ?? classifications[0] ?? null } : null,
    legality: {
      goat_world_pool: true,
      restriction,
      max_copies: restrictionToMaxCopies(restriction)
    },
    image: {
      source_src: sourceSrc,
      resolved_url: resolveImageCandidates(sourceSrc, passcode)[0] ?? null,
      file_path: null,
      file_name: fileName,
      content_type: null,
      byte_size: null,
      width: null,
      height: null,
      sha256: null,
      status: "skipped",
      error: null
    },
    related_cards: extractRelatedCards($),
    source: {
      site: SITE,
      card_pool_url: CARD_POOL_URL,
      detail_url: input.detailUrl,
      scraped_at: input.scrapedAt,
      raw_html_cache_path: input.rawHtmlCachePath
    },
    game: {
      rarity: null,
      directional_values: null,
      generated_ability: null
    }
  };

  return CardRecordSchema.parse(record);
}

function slugFromCanonical($: CheerioAPI): string {
  const href = $("link[rel='canonical']").attr("href");
  return href ? cardSlugFromUrl(href) : "";
}
