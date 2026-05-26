#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, "public/yugioh_cards/cards.json");
const TASKS_PATH = path.join(ROOT, "docs/list_of_task.md");
const MANIFEST_PATH = path.join(ROOT, "src/engine/cards/coverageManifest.generated.ts");
const MATRIX_PATH = path.join(ROOT, "docs/card-implementation-matrix.generated.json");
const SCRIPT_DIR = path.join(ROOT, "src/engine/cards/scripts");
const TEMPLATE_DIR = path.join(ROOT, "src/engine/cards/templates");
const TEST_DIR = path.join(ROOT, "src/engine/__tests__");

const STATUSES = new Set([
  "goatVanilla",
  "goatTemplate",
  "goatCustom",
  "goatForbiddenButScripted",
  "goatDeckBlocked",
  "goatUnsupported",
  "notInGoatPool",
]);

function main() {
  const command = process.argv[2] ?? "report";
  const finalMode = process.argv.includes("--final");

  if (command === "generate-matrix") {
    const matrix = buildMatrix();
    fs.writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`);
    console.log(`wrote ${path.relative(ROOT, MATRIX_PATH)} (${matrix.rows.length} rows)`);
    return;
  }

  if (command === "validate") {
    const result = validate({ finalMode });
    printValidation(result);
    process.exitCode = result.errors.length === 0 ? 0 : 1;
    return;
  }

  if (command === "report") {
    const result = validate({ finalMode: false });
    printReport(result);
    process.exitCode = result.errors.length === 0 ? 0 : 1;
    return;
  }

  console.error(`unknown command: ${command}`);
  process.exitCode = 2;
}

function validate({ finalMode }) {
  const cards = readCards();
  const tasks = readCardTasks();
  const manifest = readManifest();
  const matrix = fs.existsSync(MATRIX_PATH) ? readJson(MATRIX_PATH) : buildMatrix();
  const errors = [];
  const warnings = [];

  validateManifest(cards, manifest, errors);
  validateTasks(cards, tasks, errors);
  validateMatrix(cards, tasks, manifest, matrix, errors);
  validateGoatLegality(cards, manifest, errors);
  validateTemplateAndCustomCoverage(cards, manifest, errors);

  const counts = countStatuses(cards, manifest);
  if (finalMode && counts.goatUnsupported !== 0) {
    errors.push(`final mode requires goatUnsupported = 0, found ${counts.goatUnsupported}`);
  }

  const unsupported = cards
    .filter((card) => manifest.get(card.passcode) === "goatUnsupported")
    .map((card) => `${sourceTaskId(card.sourceIndex)} ${card.passcode} ${card.name}`);

  if (unsupported.length > 0) {
    warnings.push(`goatUnsupported cards remain: ${unsupported.length}`);
  }

  return {
    totalCards: cards.length,
    totalTasks: tasks.length,
    matrixRows: matrix.rows?.length ?? 0,
    counts,
    unsupportedSample: unsupported.slice(0, 20),
    errors,
    warnings,
  };
}

function buildMatrix() {
  const cards = readCards();
  const tasks = readCardTasks();
  const manifest = readManifest();
  const coverageMetadata = buildCoverageMetadata(cards, manifest);
  const taskByPasscode = new Map(tasks.map((task) => [task.passcode, task]));

  return {
    generatedFrom: {
      cards: path.relative(ROOT, CARDS_PATH),
      tasks: path.relative(ROOT, TASKS_PATH),
      manifest: path.relative(ROOT, MANIFEST_PATH),
      sourceIndexConvention: "zero-based cards.json array offset",
    },
    rows: cards.map((card) => {
      const task = taskByPasscode.get(card.passcode);
      const status = manifest.get(card.passcode) ?? "goatUnsupported";

      return {
        sourceIndex: card.sourceIndex,
        cardTaskId: sourceTaskId(card.sourceIndex),
        passcode: card.passcode,
        id: card.id,
        name: card.name,
        category: card.category,
        classifications: card.classifications,
        typeSummary: summarizeCardType(card),
        text: card.text,
        goatWorldPool: card.legality?.goat_world_pool === true,
        restriction: card.legality?.restriction ?? "Unknown",
        maxCopies: card.legality?.max_copies ?? null,
        implementationStatus: status,
        coverageStatus: status,
        templateFamily: coverageMetadata.get(card.passcode)?.templateFamily ?? null,
        customScriptPath: coverageMetadata.get(card.passcode)?.customScriptPath ?? null,
        rulingNotes: null,
        interactionTags: coverageMetadata.get(card.passcode)?.interactionTags ?? [],
        testFilePath: coverageMetadata.get(card.passcode)?.testFilePaths ?? [],
        unsupportedReason: status === "goatUnsupported" ? inferUnsupportedReason(card) : null,
        taskHeading: task?.heading ?? null,
      };
    }),
  };
}

function validateManifest(cards, manifest, errors) {
  const cardIds = new Set(cards.map((card) => card.passcode));
  const duplicates = duplicateValues(cards.map((card) => card.passcode));

  if (duplicates.length > 0) {
    errors.push(`duplicate cards.json passcodes: ${duplicates.join(", ")}`);
  }

  for (const [passcode, status] of manifest.entries()) {
    if (!cardIds.has(passcode)) {
      errors.push(`manifest contains passcode absent from cards.json: ${passcode}`);
    }
    if (!STATUSES.has(status)) {
      errors.push(`manifest contains invalid status for ${passcode}: ${status}`);
    }
  }

  for (const card of cards) {
    if (!manifest.has(card.passcode)) {
      errors.push(`manifest missing cards.json passcode: ${card.passcode} ${card.name}`);
    }
  }
}

function validateTasks(cards, tasks, errors) {
  const taskPasscodes = tasks.map((task) => task.passcode);
  const taskIds = tasks.map((task) => task.cardTaskId);
  const duplicateTaskPasscodes = duplicateValues(taskPasscodes);
  const duplicateTaskIds = duplicateValues(taskIds);
  const taskByPasscode = new Map(tasks.map((task) => [task.passcode, task]));

  if (duplicateTaskPasscodes.length > 0) {
    errors.push(`duplicate Card Task passcodes: ${duplicateTaskPasscodes.join(", ")}`);
  }
  if (duplicateTaskIds.length > 0) {
    errors.push(`duplicate Card Task IDs: ${duplicateTaskIds.join(", ")}`);
  }
  if (tasks.length !== cards.length) {
    errors.push(`Card Task count mismatch: tasks=${tasks.length}, cards=${cards.length}`);
  }

  for (const card of cards) {
    const expectedTaskId = sourceTaskId(card.sourceIndex);
    const task = taskByPasscode.get(card.passcode);
    if (!task) {
      errors.push(`missing Card Task for ${expectedTaskId} ${card.passcode} ${card.name}`);
      continue;
    }
    if (task.cardTaskId !== expectedTaskId) {
      errors.push(
        `Card Task ID mismatch for ${card.passcode} ${card.name}: expected ${expectedTaskId}, found ${task.cardTaskId}`,
      );
    }
    if (task.name !== card.name) {
      errors.push(`Card Task name mismatch for ${card.passcode}: expected "${card.name}", found "${task.name}"`);
    }
  }
}

function validateMatrix(cards, tasks, manifest, matrix, errors) {
  if (!matrix || !Array.isArray(matrix.rows)) {
    errors.push("matrix file is missing a rows array");
    return;
  }

  const taskByPasscode = new Map(tasks.map((task) => [task.passcode, task]));
  const rows = matrix.rows;
  const duplicateRows = duplicateValues(rows.map((row) => row.passcode));
  const rowByPasscode = new Map(rows.map((row) => [row.passcode, row]));

  if (rows.length !== cards.length) {
    errors.push(`matrix row count mismatch: matrix=${rows.length}, cards=${cards.length}`);
  }
  if (duplicateRows.length > 0) {
    errors.push(`duplicate matrix passcodes: ${duplicateRows.join(", ")}`);
  }

  for (const card of cards) {
    const row = rowByPasscode.get(card.passcode);
    const task = taskByPasscode.get(card.passcode);
    const expectedStatus = manifest.get(card.passcode);
    if (!row) {
      errors.push(`matrix missing ${card.passcode} ${card.name}`);
      continue;
    }
    if (row.sourceIndex !== card.sourceIndex) {
      errors.push(`matrix sourceIndex mismatch for ${card.passcode}: expected ${card.sourceIndex}, found ${row.sourceIndex}`);
    }
    if (row.cardTaskId !== sourceTaskId(card.sourceIndex)) {
      errors.push(`matrix Card Task ID mismatch for ${card.passcode}: expected ${sourceTaskId(card.sourceIndex)}, found ${row.cardTaskId}`);
    }
    if (row.name !== card.name || row.id !== card.id) {
      errors.push(`matrix identity mismatch for ${card.passcode}`);
    }
    if (row.implementationStatus !== expectedStatus) {
      errors.push(`matrix status mismatch for ${card.passcode}: expected ${expectedStatus}, found ${row.implementationStatus}`);
    }
    if (row.taskHeading !== (task?.heading ?? null)) {
      errors.push(`matrix task heading mismatch for ${card.passcode}`);
    }
  }
}

function validateGoatLegality(cards, manifest, errors) {
  for (const card of cards) {
    const status = manifest.get(card.passcode);
    const legality = card.legality;

    if (!legality) {
      errors.push(`missing legality data for ${card.passcode} ${card.name}`);
      continue;
    }

    if (legality.goat_world_pool !== true && status !== "notInGoatPool") {
      errors.push(`non-GOAT card must be notInGoatPool: ${card.passcode} ${card.name} has ${status}`);
    }

    if (legality.restriction === "Forbidden" && legality.max_copies !== 0) {
      errors.push(`Forbidden card must have max_copies 0: ${card.passcode} ${card.name}`);
    }
    if (legality.restriction === "Limited" && legality.max_copies !== 1) {
      errors.push(`Limited card must have max_copies 1: ${card.passcode} ${card.name}`);
    }
    if (legality.restriction === "Semi-Limited" && legality.max_copies !== 2) {
      errors.push(`Semi-Limited card must have max_copies 2: ${card.passcode} ${card.name}`);
    }
    if (legality.restriction === "Unlimited" && legality.max_copies !== 3) {
      errors.push(`Unlimited card must have max_copies 3: ${card.passcode} ${card.name}`);
    }
  }
}

function validateTemplateAndCustomCoverage(cards, manifest, errors) {
  const cardIds = new Set(cards.map((card) => card.passcode));
  const scriptMetadata = buildCoverageMetadata(cards, manifest);
  const scriptLiterals = collectEightDigitLiterals(SCRIPT_DIR);
  const manifestLiterals = collectEightDigitLiterals(MANIFEST_PATH);

  for (const literal of [...scriptLiterals, ...manifestLiterals]) {
    if (!cardIds.has(literal.value)) {
      errors.push(`${literal.file} references unknown card passcode ${literal.value}`);
    }
  }

  for (const template of listFiles(TEMPLATE_DIR, ".ts")) {
    const templateName = path.basename(template, ".ts");
    const testedBy = listFiles(TEST_DIR, ".test.ts").filter((testFile) =>
      fs.readFileSync(testFile, "utf8").includes(`cards/templates/${templateName}`),
    );

    if (testedBy.length === 0) {
      errors.push(`template ${relative(template)} has no test file import`);
    }
  }

  for (const card of cards) {
    const status = manifest.get(card.passcode);

    if (!["goatTemplate", "goatCustom", "goatForbiddenButScripted"].includes(status)) {
      continue;
    }

    const metadata = scriptMetadata.get(card.passcode);

    if (!metadata?.scriptPath) {
      errors.push(`${status} card lacks production script source: ${card.passcode} ${card.name}`);
    }

    if ((metadata?.testFilePaths.length ?? 0) === 0) {
      errors.push(`${status} card lacks targeted test file path: ${card.passcode} ${card.name}`);
    }

    if ((status === "goatCustom" || status === "goatForbiddenButScripted") && !metadata?.hasTargetedBehaviorTest) {
      errors.push(`${status} card lacks targeted behavior test reference: ${card.passcode} ${card.name}`);
    }
  }
}

function countStatuses(cards, manifest) {
  const counts = Object.fromEntries([...STATUSES].map((status) => [status, 0]));
  for (const card of cards) {
    const status = manifest.get(card.passcode) ?? "goatUnsupported";
    counts[status] += 1;
  }
  return counts;
}

function printValidation(result) {
  printReport(result);
  if (result.errors.length > 0) {
    console.error("\nErrors:");
    for (const error of result.errors) console.error(`- ${error}`);
  }
}

function printReport(result) {
  console.log(`totalCards = ${result.totalCards}`);
  console.log(`cardTasks = ${result.totalTasks}`);
  console.log(`matrixRows = ${result.matrixRows}`);
  for (const status of [...STATUSES]) {
    console.log(`${status} = ${result.counts[status]}`);
  }
  if (result.unsupportedSample.length > 0) {
    console.log("unsupportedSample:");
    for (const entry of result.unsupportedSample) console.log(`- ${entry}`);
  }
  if (result.warnings.length > 0) {
    console.log("warnings:");
    for (const warning of result.warnings) console.log(`- ${warning}`);
  }
}

function readCards() {
  return readJson(CARDS_PATH).map((card, sourceIndex) => ({ ...card, sourceIndex }));
}

function readCardTasks() {
  const markdown = fs.readFileSync(TASKS_PATH, "utf8");
  const re = /^### Card Task (C-\d{4}): (.+) `([^`]+)`$/gm;
  const tasks = [];
  let match;
  while ((match = re.exec(markdown)) !== null) {
    tasks.push({
      cardTaskId: match[1],
      name: match[2],
      passcode: match[3],
      heading: match[0],
    });
  }
  return tasks;
}

function readManifest() {
  const source = fs.readFileSync(MANIFEST_PATH, "utf8");
  const re = /^\s+"([^"]+)":\s+"([^"]+)"/gm;
  const manifest = new Map();
  let match;
  while ((match = re.exec(source)) !== null) {
    manifest.set(match[1], match[2]);
  }
  return manifest;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sourceTaskId(sourceIndex) {
  return `C-${String(sourceIndex + 1).padStart(4, "0")}`;
}

function summarizeCardType(card) {
  if (card.category === "Monster") {
    const stats = card.monster;
    return [
      "Monster",
      card.classifications?.join(", ") || null,
      stats?.attribute,
      stats?.type,
      stats?.level == null ? null : `Level ${stats.level}`,
      stats ? `ATK ${stats.atk} / DEF ${stats.def}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return [card.category, card.spell_trap?.icon].filter(Boolean).join(" | ");
}

function inferUnsupportedReason(card) {
  if (card.legality?.goat_world_pool !== true) {
    return "not-in-goat-pool-status-mismatch";
  }
  return "pending-card-script-or-exact-template";
}

function buildCoverageMetadata(cards, manifest) {
  const metadata = new Map();
  const exportedIds = readExportedCardIds();
  const tests = readTestFiles();

  for (const card of cards) {
    const status = manifest.get(card.passcode) ?? "goatUnsupported";
    const exported = exportedIds.get(card.passcode);
    const testFilePaths = tests
      .filter((test) =>
        test.content.includes(card.passcode) ||
          (exported?.constantName ? test.content.includes(exported.constantName) : false),
      )
      .map((test) => relative(test.file));

    if (status === "goatVanilla") {
      addIfMissing(testFilePaths, "src/engine/__tests__/vanillaMonster.test.ts");
    }

    const templateFamily = inferTemplateFamily(status, exported?.scriptPath);

    metadata.set(card.passcode, {
      scriptPath: exported?.scriptPath ? relative(exported.scriptPath) : status === "goatVanilla"
        ? "src/engine/cards/templates/vanillaMonster.ts"
        : null,
      templateFamily,
      customScriptPath: status === "goatCustom" || status === "goatForbiddenButScripted"
        ? exported?.scriptPath ? relative(exported.scriptPath) : null
        : null,
      interactionTags: inferInteractionTags(status, templateFamily),
      testFilePaths,
      hasTargetedBehaviorTest: testFilePaths.length > 0,
    });
  }

  return metadata;
}

function readExportedCardIds() {
  const ids = new Map();

  for (const file of listFiles(SCRIPT_DIR, ".ts")) {
    const source = fs.readFileSync(file, "utf8");
    const re = /export const ([A-Z0-9_]+_ID)\s*=\s*"(\d{8})"/g;
    let match;

    while ((match = re.exec(source)) !== null) {
      ids.set(match[2], {
        constantName: match[1],
        scriptPath: file,
      });
    }
  }

  return ids;
}

function readTestFiles() {
  return listFiles(TEST_DIR, ".test.ts").map((file) => ({
    file,
    content: fs.readFileSync(file, "utf8"),
  }));
}

function inferTemplateFamily(status, scriptPath) {
  if (status === "goatVanilla") {
    return "vanillaMonster";
  }
  if (status === "goatCustom" || status === "goatForbiddenButScripted") {
    return "customScript";
  }
  if (status !== "goatTemplate" || !scriptPath) {
    return null;
  }

  const normalized = relative(scriptPath);

  if (normalized.endsWith("/spells.ts")) {
    return "spellTemplate";
  }
  if (normalized.endsWith("/traps.ts")) {
    return "trapTemplate";
  }
  if (normalized.endsWith("/monsters.ts")) {
    return "monsterTemplate";
  }
  if (normalized.includes("/custom/")) {
    return "customTemplate";
  }

  return "template";
}

function inferInteractionTags(status, templateFamily) {
  if (status === "goatCustom" || status === "goatForbiddenButScripted") {
    return ["custom-script"];
  }
  if (templateFamily) {
    return [templateFamily];
  }
  return [];
}

function collectEightDigitLiterals(fileOrDir) {
  const files = fs.statSync(fileOrDir).isDirectory() ? listFiles(fileOrDir, ".ts") : [fileOrDir];
  const literals = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const re = /"(\d{8})"/g;
    let match;

    while ((match = re.exec(source)) !== null) {
      literals.push({ file: relative(file), value: match[1] });
    }
  }

  return literals;
}

function listFiles(dir, suffix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, suffix));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function addIfMissing(values, value) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

function duplicateValues(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

main();
