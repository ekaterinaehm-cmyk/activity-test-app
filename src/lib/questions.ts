import questionsData from "../../data/questions.json";

export type QuestionType =
  | "free_text"
  | "free_text_long"
  | "single_select"
  | "multi_select"
  | "ranking"
  | "likert_group"
  | "color_test"
  | "industry_block"
  | "iq_matrix";

export interface BaseQuestion {
  id: string;
  number: number;
  type: QuestionType;
  required: boolean;
  /** Translation key inside the locale JSON, e.g. "q.2.prompt". */
  promptKey: string;
}

export interface FreeTextQuestion extends BaseQuestion {
  type: "free_text" | "free_text_long";
}

export interface SingleSelectQuestion extends BaseQuestion {
  type: "single_select";
  options: string[]; // option keys -> "q.{n}.opt.{k}"
}

export interface MultiSelectQuestion extends BaseQuestion {
  type: "multi_select";
  options: string[];
}

export interface RankingQuestion extends BaseQuestion {
  type: "ranking";
  options: string[];
  /** e.g. {min: 1, max: 7} */
  scale: { min: number; max: number };
}

export interface LikertGroupQuestion extends BaseQuestion {
  type: "likert_group";
  items: string[]; // each item is rated on the same scale
  scale: { min: number; max: number };
}

export interface ColorTestQuestion extends BaseQuestion {
  type: "color_test";
  externalUrl: string;
}

export interface IndustryBlockQuestion extends BaseQuestion {
  type: "industry_block";
  industries: string[]; // option keys
  subjects: string[]; // ["self","mother","father"]
}

export interface IqMatrixQuestion extends BaseQuestion {
  type: "iq_matrix";
  items: string[]; // 3 categories
  options: string[]; // ["harder","easier"]
}

export type Question =
  | FreeTextQuestion
  | SingleSelectQuestion
  | MultiSelectQuestion
  | RankingQuestion
  | LikertGroupQuestion
  | ColorTestQuestion
  | IndustryBlockQuestion
  | IqMatrixQuestion;

export const questions = questionsData as Question[];

export const QUESTIONS_PER_PAGE = 6;

export function pageCount(): number {
  return Math.ceil(questions.length / QUESTIONS_PER_PAGE);
}

export function questionsForPage(page: number): Question[] {
  const start = page * QUESTIONS_PER_PAGE;
  return questions.slice(start, start + QUESTIONS_PER_PAGE);
}
