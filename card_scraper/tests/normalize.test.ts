import { describe, expect, it } from "vitest";
import { detectDuplicateFileNames, deterministicFileName, resolveImageCandidates, slugifyCardName } from "../src/normalize.js";

describe("normalization", () => {
  it("slugifies punctuation and quotes consistently", () => {
    expect(slugifyCardName(" D.D. Warrior Lady's #1 ")).toBe("d-d-warrior-ladys-1");
    expect(slugifyCardName("Harpie’s Feather Duster")).toBe("harpies-feather-duster");
  });

  it("builds deterministic file names while preserving leading zeros", () => {
    expect(deterministicFileName("09786492", "White Dragon Ritual")).toBe("09786492_white-dragon-ritual.webp");
  });

  it("detects duplicate filenames", () => {
    expect(
      detectDuplicateFileNames([
        { file_name: "1_same.webp", name: "Same" },
        { file_name: "1_same.webp", name: "Same Again" }
      ])
    ).toEqual(["1_same.webp: Same / Same Again"]);
  });

  it("resolves Next.js optimizer URLs and leading-zero fallbacks", () => {
    expect(resolveImageCandidates("/_next/image?url=%2Fgoat-db%2F09786492.webp&w=640&q=75", "09786492")).toEqual([
      "https://goatworld.community/_next/image?url=%2Fgoat-db%2F09786492.webp&w=640&q=75",
      "https://goatworld.community/goat-db/09786492.webp",
      "https://goatworld.community/goat-db/9786492.webp"
    ]);
  });
});
