import type { Question } from "./questions";

export type AnswerValue =
  | string
  | string[]
  | Record<string, number>
  | Record<string, string[]>
  | { items: Record<string, string>; result?: string };

export type Answers = Record<string, AnswerValue>;

export interface Submission {
  locale: string;
  email: string;
  answers: Answers;
}

/** Returns true when an answer counts as "filled in" for a required-field check. */
export function isAnswered(q: Question, v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  switch (q.type) {
    case "free_text":
    case "free_text_long":
    case "color_test":
      return typeof v === "string" && v.trim().length > 0;
    case "single_select":
      return typeof v === "string" && v.length > 0;
    case "multi_select":
      return Array.isArray(v) && v.length > 0;
    case "ranking": {
      // every option must have a rank, and ranks must be unique
      const obj = v as Record<string, number>;
      const opts = q.options;
      if (opts.some((o) => obj[o] === undefined)) return false;
      const used = new Set(Object.values(obj));
      return used.size === opts.length;
    }
    case "likert_group": {
      const obj = v as Record<string, number>;
      return q.items.every((i) => typeof obj[i] === "number");
    }
    case "industry_block": {
      const obj = v as Record<string, string[]>;
      return q.subjects.every((s) => Array.isArray(obj[s]) && obj[s].length > 0);
    }
    case "iq_matrix": {
      const obj = v as { items?: Record<string, string> };
      return !!obj.items && q.items.every((i) => obj.items![i] !== undefined);
    }
  }
}
