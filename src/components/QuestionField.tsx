"use client";

import { useTranslations } from "next-intl";
import type { Question } from "@/lib/questions";
import type { AnswerValue } from "@/lib/answers";

interface Props {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  invalid?: boolean;
}

export function QuestionField({ q, value, onChange, invalid }: Props) {
  const t = useTranslations();
  const prompt = t(q.promptKey);

  return (
    <fieldset className={`card space-y-4 ${invalid ? "border-red-400" : ""}`}>
      <legend className="block">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">
          {q.number} / 54{q.required ? " *" : ""}
        </span>
        <h3 className="mt-1 text-base md:text-lg font-medium leading-snug">{prompt}</h3>
      </legend>
      <Body q={q} value={value} onChange={onChange} />
      {invalid && (
        <p role="alert" className="text-sm text-red-600">
          {t("test.required")}
        </p>
      )}
    </fieldset>
  );
}

function Body({ q, value, onChange }: Omit<Props, "invalid">) {
  switch (q.type) {
    case "free_text":
      return <FreeText q={q} value={value as string | undefined} onChange={onChange} />;
    case "free_text_long":
      return <FreeText q={q} value={value as string | undefined} onChange={onChange} long />;
    case "single_select":
      return <SingleSelect q={q} value={value as string | undefined} onChange={onChange} />;
    case "multi_select":
      return <MultiSelect q={q} value={(value as string[]) ?? []} onChange={onChange} />;
    case "ranking":
      return <Ranking q={q} value={(value as Record<string, number>) ?? {}} onChange={onChange} />;
    case "likert_group":
      return <LikertGroup q={q} value={(value as Record<string, number>) ?? {}} onChange={onChange} />;
    case "color_test":
      return <ColorTest q={q} value={value as string | undefined} onChange={onChange} />;
    case "industry_block":
      return <IndustryBlock q={q} value={(value as Record<string, string[]>) ?? {}} onChange={onChange} />;
    case "iq_matrix":
      return <IqMatrix q={q} value={(value as { items: Record<string, string>; result?: string }) ?? { items: {} }} onChange={onChange} />;
  }
}

function FreeText({
  q,
  value,
  onChange,
  long,
}: {
  q: Question;
  value: string | undefined;
  onChange: (v: AnswerValue) => void;
  long?: boolean;
}) {
  const Tag = long ? "textarea" : "input";
  return (
    <Tag
      aria-label={`Q${q.number}`}
      className={`field ${long ? "min-h-[6rem]" : ""}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      {...(long ? { rows: 4 } : { type: "text" })}
    />
  );
}

function SingleSelect({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "single_select" }>;
  value: string | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const t = useTranslations();
  return (
    <div className="grid gap-2">
      {q.options.map((opt) => {
        const id = `${q.id}-${opt}`;
        return (
          <label
            key={opt}
            htmlFor={id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
              value === opt ? "border-accent bg-accent/5" : "border-ink/15 hover:bg-ink/5"
            }`}
          >
            <input
              id={id}
              type="radio"
              name={q.id}
              className="h-4 w-4 accent-accent"
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{t(`${q.id}.opt.${opt}`)}</span>
          </label>
        );
      })}
    </div>
  );
}

function MultiSelect({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "multi_select" }>;
  value: string[];
  onChange: (v: AnswerValue) => void;
}) {
  const t = useTranslations();
  const toggle = (opt: string) => {
    const set = new Set(value);
    set.has(opt) ? set.delete(opt) : set.add(opt);
    onChange([...set]);
  };
  return (
    <div className="grid gap-2">
      {q.options.map((opt) => {
        const id = `${q.id}-${opt}`;
        const checked = value.includes(opt);
        return (
          <label
            key={opt}
            htmlFor={id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
              checked ? "border-accent bg-accent/5" : "border-ink/15 hover:bg-ink/5"
            }`}
          >
            <input
              id={id}
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={checked}
              onChange={() => toggle(opt)}
            />
            <span>{t(`${q.id}.opt.${opt}`)}</span>
          </label>
        );
      })}
    </div>
  );
}

function Ranking({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "ranking" }>;
  value: Record<string, number>;
  onChange: (v: AnswerValue) => void;
}) {
  const t = useTranslations();
  const { min, max } = q.scale;
  const set = (opt: string, rank: number | undefined) => {
    const next = { ...value };
    if (rank === undefined) delete next[opt];
    else next[opt] = rank;
    onChange(next);
  };
  const dupCheck = (() => {
    const seen = new Set<number>();
    for (const v of Object.values(value)) {
      if (seen.has(v)) return true;
      seen.add(v);
    }
    return false;
  })();
  const ranks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">{t("test.rankInstruction", { min, max })}</p>
      <ul className="grid gap-2">
        {q.options.map((opt) => (
          <li key={opt} className="flex items-center justify-between gap-3 rounded-xl border border-ink/15 bg-white px-3 py-2">
            <span className="text-sm md:text-base">{t(`${q.id}.opt.${opt}`)}</span>
            <select
              aria-label={`${q.id} ${opt} rank`}
              className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
              value={value[opt] ?? ""}
              onChange={(e) => set(opt, e.target.value === "" ? undefined : Number(e.target.value))}
            >
              <option value="">—</option>
              {ranks.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {dupCheck && <p className="text-sm text-red-600">{t("test.rankDuplicate")}</p>}
    </div>
  );
}

function LikertGroup({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "likert_group" }>;
  value: Record<string, number>;
  onChange: (v: AnswerValue) => void;
}) {
  const t = useTranslations();
  const { min, max } = q.scale;
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-3">
      {q.items.map((item) => (
        <div key={item} className="rounded-xl border border-ink/15 bg-white p-3">
          <p className="text-sm md:text-base mb-2">{t(`${q.id}.items.${item}`)}</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${q.id} ${item}`}>
            {ticks.map((tick) => {
              const checked = value[item] === tick;
              return (
                <button
                  key={tick}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={`h-9 w-9 rounded-lg border text-sm font-medium transition ${
                    checked ? "border-accent bg-accent text-white" : "border-ink/15 bg-white hover:bg-ink/5"
                  }`}
                  onClick={() => onChange({ ...value, [item]: tick })}
                >
                  {tick}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorTest({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "color_test" }>;
  value: string | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const t = useTranslations();
  return (
    <div className="space-y-3">
      <a
        href={q.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary inline-flex"
      >
        {t("test.openLink")} ↗
      </a>
      <textarea
        aria-label={`Q${q.number} result`}
        rows={3}
        placeholder={t("test.pasteResultUrl")}
        className="field"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function IndustryBlock({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "industry_block" }>;
  value: Record<string, string[]>;
  onChange: (v: AnswerValue) => void;
}) {
  const t = useTranslations();
  const subjectLabel: Record<string, string> = {
    self: t("test.industrySelf"),
    mother: t("test.industryMother"),
    father: t("test.industryFather"),
  };
  const toggle = (subject: string, industry: string) => {
    const cur = new Set(value[subject] ?? []);
    cur.has(industry) ? cur.delete(industry) : cur.add(industry);
    onChange({ ...value, [subject]: [...cur] });
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="py-2 text-left font-medium">{t("test.industryHeader")}</th>
            {q.subjects.map((s) => (
              <th key={s} className="py-2 px-2 text-center font-medium whitespace-nowrap">
                {subjectLabel[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.industries.map((ind) => (
            <tr key={ind} className="border-b border-ink/5">
              <td className="py-2 pr-2">{t(`${q.id}.industries.${ind}`)}</td>
              {q.subjects.map((s) => {
                const checked = (value[s] ?? []).includes(ind);
                return (
                  <td key={s} className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${ind} ${s}`}
                      className="h-5 w-5 accent-accent"
                      checked={checked}
                      onChange={() => toggle(s, ind)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IqMatrix({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "iq_matrix" }>;
  value: { items: Record<string, string>; result?: string };
  onChange: (v: AnswerValue) => void;
}) {
  const t = useTranslations();
  const optLabel: Record<string, string> = {
    harder: t("test.iqHarder"),
    easier: t("test.iqEasier"),
  };
  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="py-2 text-left font-medium">{t("test.iqHeader")}</th>
            {q.options.map((o) => (
              <th key={o} className="py-2 px-2 text-center font-medium">{optLabel[o]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.items.map((item) => (
            <tr key={item} className="border-b border-ink/5">
              <td className="py-2 pr-2">{t(`${q.id}.items.${item}`)}</td>
              {q.options.map((o) => (
                <td key={o} className="py-2 px-2 text-center">
                  <input
                    type="radio"
                    name={`${q.id}-${item}`}
                    aria-label={`${item} ${o}`}
                    className="h-4 w-4 accent-accent"
                    checked={value.items?.[item] === o}
                    onChange={() => onChange({ items: { ...(value.items ?? {}), [item]: o }, result: value.result })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <input
        type="text"
        className="field"
        placeholder="IQ result"
        value={value.result ?? ""}
        onChange={(e) => onChange({ items: value.items ?? {}, result: e.target.value })}
      />
    </div>
  );
}
