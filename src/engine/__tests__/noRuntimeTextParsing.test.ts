import { describe, expect, it } from "vitest";

const engineSources = import.meta.glob("../**/*.ts", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const allowedTextUsageFiles = new Set([
  "../data/cardCatalog.ts",
  "../data/normalizeCard.ts",
]);

const forbiddenBehaviorParserPatterns = [
  /\bparse(?:Card|Effect|Behavior|Rule|Rules|Text)\b/i,
  /\b(?:card|effect|behavior|rule|rules|text)(?:Parser|Parsing)\b/i,
  /from\s+["'][^"']*(?:card[-_]text|effect[-_]text|behavior[-_]parser|rules?[-_]parser|text[-_]parser)[^"']*["']/i,
  /import\s+[^;\n]*\b(?:parser|parsing)\b/i,
];

const cardTextUsagePattern =
  /(?:\.\s*text\b|\[\s*["']text["']\s*\]|\b(?:readonly\s+)?text\s*:|\btext\s*\.\s*(?:includes|match|search|startsWith|endsWith|toLowerCase|toUpperCase|split|replace|indexOf)\b)/;

describe("no runtime card-text parsing guard", () => {
  it("does not import or call behavior parser helpers in engine runtime modules", () => {
    expect(sourceOffenders(forbiddenBehaviorParserPatterns, isRuntimeModule)).toEqual([]);
  });

  it("uses card text only in catalog/display normalization files", () => {
    const textUsageFiles = new Set(
      sourceOffenders([cardTextUsagePattern], isEngineModule),
    );

    expect([...textUsageFiles].sort()).toEqual([...allowedTextUsageFiles].sort());
  });

  it("does not use card text inside runtime behavior modules", () => {
    expect(sourceOffenders([cardTextUsagePattern], isRuntimeBehaviorModule)).toEqual([]);
  });
});

function sourceOffenders(
  patterns: readonly RegExp[],
  includePath: (path: string) => boolean,
): string[] {
  return Object.entries(engineSources)
    .filter(([path]) => includePath(path))
    .filter(([, source]) => patterns.some((pattern) => pattern.test(source)))
    .map(([path]) => path)
    .sort();
}

function isEngineModule(path: string): boolean {
  return !path.includes("/__tests__/") && !path.endsWith(".test.ts");
}

function isRuntimeModule(path: string): boolean {
  return isEngineModule(path) && !path.includes("/testing/");
}

function isRuntimeBehaviorModule(path: string): boolean {
  return isRuntimeModule(path) && !allowedTextUsageFiles.has(path);
}
