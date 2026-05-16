import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { questions, type Question } from "./questions";
import { localeNames, type Locale } from "@/i18n/config";

const MODEL = "claude-sonnet-4-6";

let cachedPrompt: string | null = null;
async function loadSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  const file = path.join(process.cwd(), "prompts", "interpret.md");
  cachedPrompt = await readFile(file, "utf-8");
  return cachedPrompt;
}

let cachedLocale: Record<string, Record<string, unknown>> = {};
async function loadLocale(locale: string): Promise<Record<string, unknown>> {
  if (cachedLocale[locale]) return cachedLocale[locale];
  const file = path.join(process.cwd(), "locales", `${locale}.json`);
  const raw = await readFile(file, "utf-8");
  cachedLocale[locale] = JSON.parse(raw);
  return cachedLocale[locale];
}

function get(obj: Record<string, unknown>, dottedPath: string): string | undefined {
  const segments = dottedPath.split(".");
  let cur: unknown = obj;
  for (const s of segments) {
    if (cur && typeof cur === "object" && s in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[s];
    } else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Render a single answer into a human-readable string in the user's locale. */
function renderAnswer(q: Question, value: unknown, locale: Record<string, unknown>): string {
  if (value === undefined || value === null || value === "") return "(не отвечено / no answer)";
  switch (q.type) {
    case "free_text":
    case "free_text_long":
    case "color_test":
      return String(value).trim();
    case "single_select": {
      const opt = String(value);
      return get(locale, `${q.id}.opt.${opt}`) ?? opt;
    }
    case "multi_select": {
      const arr = (value as string[]) ?? [];
      return arr.map((o) => get(locale, `${q.id}.opt.${o}`) ?? o).join("; ");
    }
    case "ranking": {
      const obj = (value as Record<string, number>) ?? {};
      return Object.entries(obj)
        .sort((a, b) => a[1] - b[1])
        .map(([opt, r]) => `${r}. ${get(locale, `${q.id}.opt.${opt}`) ?? opt}`)
        .join("; ");
    }
    case "likert_group": {
      const obj = (value as Record<string, number>) ?? {};
      return q.items
        .map((i) => `${get(locale, `${q.id}.items.${i}`) ?? i}: ${obj[i] ?? "—"}/10`)
        .join("; ");
    }
    case "industry_block": {
      const obj = (value as Record<string, string[]>) ?? {};
      return q.subjects
        .map((s) => {
          const sLabel = get(locale, `q15.subjects.${s}`) ?? s;
          const inds = (obj[s] ?? []).map((i) => get(locale, `q15.industries.${i}`) ?? i).join(", ");
          return `${sLabel}: ${inds || "—"}`;
        })
        .join("\n");
    }
    case "iq_matrix": {
      const obj = (value as { items?: Record<string, string>; result?: string }) ?? {};
      const items = q.items
        .map((i) => {
          const label = get(locale, `${q.id}.items.${i}`) ?? i;
          const v = obj.items?.[i];
          const valLabel = v ? get(locale, `${q.id}.opt.${v}`) ?? v : "—";
          return `${label}: ${valLabel}`;
        })
        .join("; ");
      return obj.result ? `${items} | IQ: ${obj.result}` : items;
    }
  }
}

/** Builds the user-message body fed to Claude. */
export async function buildUserMessage(
  localeCode: string,
  answers: Record<string, unknown>
): Promise<string> {
  const locale = await loadLocale(localeCode);
  const langName = localeNames[localeCode as Locale] ?? localeCode;
  const lines: string[] = [
    `Language of response: ${langName} (code: ${localeCode}).`,
    "",
    "User's answers to the 54-question activity test follow. Each entry is:",
    "  [Q<n>] <prompt> -> <answer>",
    "",
  ];
  for (const q of questions) {
    const prompt = get(locale, q.promptKey) ?? q.promptKey;
    const rendered = renderAnswer(q, answers[q.id], locale);
    lines.push(`[Q${q.number}] ${prompt}`);
    lines.push(`  -> ${rendered}`);
    lines.push("");
  }
  return lines.join("\n");
}

const ANSWERS_HEADING: Record<string, string> = {
  en: "Your submitted answers",
  ru: "Ваши ответы",
  de: "Ihre eingereichten Antworten",
  fr: "Vos réponses",
  es: "Tus respuestas",
  it: "Le tue risposte",
  pt: "Suas respostas",
  pl: "Twoje odpowiedzi",
  uk: "Ваші відповіді",
  zh: "您提交的答案",
  ja: "ご提出された回答",
};

const NO_ANSWER_LABEL: Record<string, string> = {
  en: "(no answer)",
  ru: "(нет ответа)",
  de: "(keine Antwort)",
  fr: "(pas de réponse)",
  es: "(sin respuesta)",
  it: "(nessuna risposta)",
  pt: "(sem resposta)",
  pl: "(brak odpowiedzi)",
  uk: "(немає відповіді)",
  zh: "(未作答)",
  ja: "(回答なし)",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders the user's submitted answers as an HTML block appended to the email. */
export async function renderAnswersHtml(
  localeCode: string,
  answers: Record<string, unknown>
): Promise<string> {
  const locale = await loadLocale(localeCode);
  const heading = ANSWERS_HEADING[localeCode] ?? ANSWERS_HEADING.en;
  const noAns = NO_ANSWER_LABEL[localeCode] ?? NO_ANSWER_LABEL.en;

  const rows: string[] = [];
  for (const q of questions) {
    const prompt = get(locale, q.promptKey) ?? q.promptKey;
    const raw = answers[q.id];
    const rendered =
      raw === undefined || raw === null || raw === ""
        ? noAns
        : renderAnswer(q, raw, locale);
    rows.push(
      `<p style="margin:14px 0 4px;font-size:13px;color:#666"><strong>Q${q.number}.</strong> ${escapeHtml(
        prompt
      )}</p><p style="margin:0 0 4px;font-size:14px;white-space:pre-wrap">${escapeHtml(
        rendered
      )}</p>`
    );
  }
  return `<hr style="margin:32px 0;border:none;border-top:1px solid #ddd"><h2 style="font-size:18px;color:#333">${escapeHtml(
    heading
  )}</h2>${rows.join("\n")}`;
}

export async function interpret(localeCode: string, answers: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey });
  const system = await loadSystemPrompt();
  const userMessage = await buildUserMessage(localeCode, answers);

  const result = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const html = result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();
  return html;
}
