import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCardDetail } from "../src/scrapeCardDetail.js";

const fixturesDir = path.resolve("fixtures");

function parseFixture(fileName: string, urlSlug: string) {
  return parseCardDetail({
    html: readFileSync(path.join(fixturesDir, fileName), "utf8"),
    detailUrl: `https://goatworld.community/cards/${urlSlug}`,
    scrapedAt: "2026-01-01T00:00:00.000Z",
    rawHtmlCachePath: null
  });
}

describe("parseCardDetail", () => {
  it("parses an effect monster detail page", () => {
    const card = parseFixture("sample-monster.html", "3-hump-lacooda");
    expect(card.name).toBe("3-Hump Lacooda");
    expect(card.passcode).toBe("86988864");
    expect(card.category).toBe("Monster");
    expect(card.classifications).toEqual(["Effect"]);
    expect(card.monster).toMatchObject({ attribute: "EARTH", type: "Beast", level: 3, atk: 500, def: 1500 });
    expect(card.file_name).toBe("86988864_3-hump-lacooda.webp");
  });

  it("parses a normal spell detail page", () => {
    const card = parseFixture("sample-spell.html", "a-feint-plan");
    expect(card.category).toBe("Spell");
    expect(card.spell_trap).toEqual({ icon: "Normal" });
    expect(card.monster).toBeNull();
  });

  it("parses a trap detail page", () => {
    const card = parseFixture("sample-trap.html", "magic-cylinder");
    expect(card.category).toBe("Trap");
    expect(card.spell_trap).toEqual({ icon: "Normal" });
  });

  it("parses a fusion monster", () => {
    const card = parseFixture("sample-fusion.html", "thousand-eyes-restrict");
    expect(card.classifications).toEqual(["Effect", "Fusion"]);
    expect(card.monster?.atk).toBe(0);
  });

  it("parses multiple monster classifications", () => {
    const card = parseFixture("sample-union-spirit.html", "synthetic-test-card");
    expect(card.classifications).toEqual(["Effect", "Union", "Spirit"]);
  });

  it("preserves leading zero passcodes", () => {
    const card = parseFixture("sample-leading-zero-passcode.html", "white-dragon-ritual");
    expect(card.passcode).toBe("09786492");
    expect(card.file_name).toBe("09786492_white-dragon-ritual.webp");
  });
});
