import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../src/normalize.js";
import { parseBanlist } from "../src/scrapeBanlist.js";

describe("parseBanlist", () => {
  it("parses embedded Next.js banlist arrays", () => {
    const html = readFileSync(path.resolve("fixtures/sample-banlist.html"), "utf8");
    const banlist = parseBanlist(html, ["Magic Cylinder"]);
    expect(banlist.counts.Forbidden).toBe(2);
    expect(banlist.counts.Limited).toBe(1);
    expect(banlist.counts["Semi-Limited"]).toBe(1);
    expect(banlist.restrictionsByName.get(normalizeCardName("Magic Cylinder"))).toBe("Limited");
    expect(banlist.unmatched).toContain(normalizeCardName("Chaos Emperor Dragon - Envoy of the End"));
  });
});
