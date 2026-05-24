import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cardsPath = path.join(repoRoot, "yugioh_cards/cards.json");
const manifestPath = path.join(repoRoot, "src/engine/effectProgress.json");
const reviewDir = path.join(repoRoot, "src/engine/cardReviews");
const currentAuditVersion = 1;

const args = parseArgs(process.argv.slice(2));

await run();

async function run() {
  const cards = await readJson(cardsPath);
  const manifest = await readJson(manifestPath);
  const now = new Date().toISOString();
  let finalized = 0;
  let skipped = 0;

  await mkdir(reviewDir, { recursive: true });

  for (const card of cards) {
    if (!isVanillaMonster(card)) {
      continue;
    }

    const entry = manifest[card.passcode];

    if (!entry) {
      throw new Error(`Missing effectProgress row for ${card.passcode} ${card.name}.`);
    }

    if (isAuditComplete(entry) && !args.force) {
      skipped += 1;
      continue;
    }

    const reviewedEntry = {
      ...entry,
      status: "no-op",
      auditVersion: currentAuditVersion,
      previousStatus: entry.previousStatus ?? entry.status,
      reviewedAt: now,
      reviewPromptId: "deterministic-vanilla-noop",
      localTextHash: localTextHash(card),
      implementationSummary:
        "Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.",
      acceptanceTests: [
        "Card script registry contains an explicit no-op entry for this passcode.",
        "Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.",
      ],
      rulingNotes: [
        "Local Goat World card record classifies this card as a Normal Monster.",
        "The card has no effect-bearing classification, so it has no activated, trigger, continuous, replacement, battle, phase, summon, or targeting logic to implement.",
      ],
      claimedAt: entry.claimedAt ?? now,
      completedAt: now,
      attempts: entry.attempts ?? 0,
      mechanicTags: ["monster", "normal", "vanilla-monster"],
      implementationFile: "src/engine/cardScripts.ts",
      testFile: "deferred:src/engine/__tests__/engine.test.ts",
      notes: "Audit v1 finalized deterministically as explicit no-op vanilla monster.",
    };

    manifest[card.passcode] = reviewedEntry;
    await writeFile(cardReviewPath(card, reviewedEntry), reviewMarkdown(card, reviewedEntry));
    finalized += 1;
  }

  if (!args.dryRun) {
    await writeJson(manifestPath, manifest);
  }

  console.log(`Vanilla no-op audit ${args.dryRun ? "would finalize" : "finalized"} ${finalized} card(s).`);
  console.log(`Skipped already complete vanilla no-op card(s): ${skipped}.`);
}

function parseArgs(rawArgs) {
  const parsed = {
    dryRun: false,
    force: false,
  };

  for (const arg of rawArgs) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--force") {
      parsed.force = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function reviewMarkdown(card, entry) {
  return `# ${card.name} (${card.passcode})\n\n` +
    `- Audit version: ${currentAuditVersion}\n` +
    `- Order: ${entry.order}\n` +
    `- Status: no-op\n` +
    `- Category: ${card.category}\n` +
    `- Classifications: ${card.classifications.join(", ") || "None"}\n` +
    `- Local text hash: ${entry.localTextHash}\n\n` +
    `## Local Card Text\n\n${card.text || "(No effect text.)"}\n\n` +
    `## No-Op Review\n\n` +
    `This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. ` +
    `It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.\n\n` +
    `## Ruling Sources\n\n${entry.rulingSources.map((source) => `- ${source}`).join("\n")}\n\n` +
    `## Implementation Summary\n\n${entry.implementationSummary}\n\n` +
    `## Acceptance Tests\n\n${entry.acceptanceTests.map((test) => `- ${test}`).join("\n")}\n`;
}

function cardReviewPath(card, entry) {
  return path.join(
    reviewDir,
    `${paddedOrder(entry.order)}-${card.passcode}-${slug(card.slug ?? card.name)}.md`,
  );
}

function paddedOrder(order) {
  return String(order).padStart(4, "0");
}

function isAuditComplete(entry) {
  return (
    ["verified", "no-op"].includes(entry.status) &&
    entry.auditVersion === currentAuditVersion &&
    Boolean(entry.reviewedAt && entry.localTextHash && entry.implementationSummary) &&
    Array.isArray(entry.rulingNotes) &&
    entry.rulingNotes.length > 0
  );
}

function isVanillaMonster(card) {
  return (
    card.category === "Monster" &&
    card.classifications.includes("Normal") &&
    !card.classifications.some((classification) =>
      ["Effect", "Spirit", "Union", "Toon"].includes(classification),
    )
  );
}

function localTextHash(card) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        passcode: card.passcode,
        name: card.name,
        category: card.category,
        classifications: card.classifications,
        text: card.text,
        monster: card.monster,
        spell_trap: card.spell_trap,
        legality: card.legality,
      }),
    )
    .digest("hex");
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
