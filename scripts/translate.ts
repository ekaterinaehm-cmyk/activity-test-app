/**
 * Generates locales/{de,fr,es,it,pt,pl,uk}.json from locales/ru.json using Claude.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/translate.ts            # all missing
 *   ANTHROPIC_API_KEY=... npx tsx scripts/translate.ts de fr      # only these
 *
 * The script reads the Russian master (since the original test was authored in
 * Russian) and asks Claude to translate the FULL JSON structure into each
 * target language, preserving keys and JSON shape exactly. Review each
 * generated file before adding the locale to src/i18n/config.ts:locales.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const SOURCE_LOCALE = "ru";
const TARGETS = ["en", "de", "fr", "es", "it", "pt", "pl", "uk"] as const;
type Target = (typeof TARGETS)[number];

const LANG_NAMES: Record<Target, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese (European/Brazilian neutral)",
  pl: "Polish",
  uk: "Ukrainian",
};

const MODEL = "claude-sonnet-4-6";

async function translateOne(client: Anthropic, sourceJson: string, target: Target): Promise<string> {
  const lang = LANG_NAMES[target];
  const system = `You are a professional translator working on a psychology / career-orientation test originally written in Russian.

Your job: translate a JSON file from Russian into ${lang}. Rules:
- Preserve the JSON structure EXACTLY. Every key must remain identical (do not translate keys).
- Translate only string values.
- Translate the option labels naturally, not literally — "${lang}" speakers should feel this was written in their language.
- Preserve placeholders like {current}, {total}, {percent}, {min}, {max}, {email}.
- Preserve markdown-style emphasis if present.
- For the "meta.language" field, write the language name in ${lang} (e.g. for German: "Deutsch").
- Output ONLY the translated JSON — no commentary, no code fences.`;

  const result = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: sourceJson }],
  });

  const raw = result.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  // Strip code fences just in case the model adds them.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  // Validate JSON before writing.
  JSON.parse(cleaned);
  return cleaned;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Set ANTHROPIC_API_KEY first.");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  const argTargets = process.argv.slice(2);
  const targets: Target[] =
    argTargets.length > 0
      ? (argTargets.filter((t): t is Target => (TARGETS as readonly string[]).includes(t)))
      : TARGETS.filter((t) => t !== "en"); // en is hand-translated; en is shipped

  const sourcePath = path.join(process.cwd(), "locales", `${SOURCE_LOCALE}.json`);
  const sourceJson = await readFile(sourcePath, "utf-8");

  for (const target of targets) {
    // SOURCE_LOCALE ("ru") is excluded from TARGETS by construction.
    const outPath = path.join(process.cwd(), "locales", `${target}.json`);
    console.log(`Translating → ${target} (${LANG_NAMES[target]}) ...`);
    try {
      const translated = await translateOne(client, sourceJson, target);
      await writeFile(outPath, translated + "\n", "utf-8");
      console.log(`  wrote ${outPath}`);
    } catch (e) {
      console.error(`  failed:`, e);
    }
  }
  console.log("\nRemember to review each file and add the locale to src/i18n/config.ts:locales before shipping.");
}

main();
