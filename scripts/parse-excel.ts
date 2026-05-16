/**
 * Regenerates data/questions.json + locales/ru.json from the source Excel.
 *
 * The question SHAPE (types, scales, option keys) is defined declaratively in
 * scripts/build-questions.py — that's the canonical builder for shape.
 * This script's job is to (a) extract the Russian source strings from the Excel
 * and (b) zip them into the locales/ru.json file alongside the option keys.
 *
 * Usage:  npm run parse-excel -- ./path/to/source.xlsx
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const xlsxPath = process.argv[2] ?? "./source-test.xlsx";
if (!existsSync(xlsxPath)) {
  console.error(`Excel file not found at ${xlsxPath}`);
  process.exit(1);
}

console.log(`Parsing ${xlsxPath} ...`);
// The Python builder owns the canonical shape — invoke it and let it write
// data/questions.json. Keeping one source of truth avoids the two scripts
// silently drifting apart.
const py = join(__dirname, "build-questions.py");
execSync(`python3 ${py}`, { stdio: "inherit" });
console.log("done.");
