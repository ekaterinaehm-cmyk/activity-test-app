"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { pageCount, questions, questionsForPage } from "@/lib/questions";
import { isAnswered, type AnswerValue, type Answers } from "@/lib/answers";
import { QuestionField } from "./QuestionField";

interface Props {
  locale: string;
}

const STORAGE_KEY = "activity-test:draft:v1";

type Step = "email" | "questions";

interface Draft {
  step: Step;
  answers: Answers;
  email: string;
  consent: boolean;
  page: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TestRunner({ locale }: Props) {
  const t = useTranslations();
  const router = useRouter();

  const total = pageCount();
  const [step, setStep] = useState<Step>("email");
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ---- Persist + restore draft -------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Draft>;
        setAnswers(d.answers ?? {});
        setEmail(d.email ?? "");
        setConsent(d.consent ?? false);
        setPage(Math.min(Math.max(0, d.page ?? 0), total - 1));
        setStep(d.step === "questions" ? "questions" : "email");
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [total]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, answers, email, consent, page } satisfies Draft)
      );
    } catch {
      /* ignore quota */
    }
  }, [step, answers, email, consent, page, hydrated]);

  // ---- Progress (counts questions only) ----------------------------------------
  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(q, answers[q.id])).length,
    [answers]
  );
  const percent = Math.round((answeredCount / questions.length) * 100);

  // ---- Validation -------------------------------------------------------------
  const pageQuestions = questionsForPage(page);
  const requiredInvalidOnPage = useCallback(
    () => pageQuestions.filter((q) => q.required && !isAnswered(q, answers[q.id])),
    [pageQuestions, answers]
  );
  const allRequiredAnswered = useMemo(
    () => questions.every((q) => !q.required || isAnswered(q, answers[q.id])),
    [answers]
  );
  const emailValid = EMAIL_RE.test(email);

  // ---- Handlers ---------------------------------------------------------------
  const setAnswer = (id: string, v: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  };

  const continueToQuestions = () => {
    if (!emailValid || !consent) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep("questions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    const bad = requiredInvalidOnPage();
    if (bad.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setPage((p) => Math.min(p + 1, total - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setShowErrors(false);
    if (page === 0) {
      setStep("email");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPage((p) => Math.max(p - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!allRequiredAnswered) {
      setShowErrors(true);
      setSubmitError(t("test.validationError"));
      return;
    }
    if (!emailValid || !consent) {
      setShowErrors(true);
      setStep("email");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, email, answers }),
      });
      if (res.status === 429) {
        setSubmitError(t("errors.rateLimited"));
        return;
      }
      if (!res.ok) {
        setSubmitError(t("errors.submitFailed"));
        return;
      }
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/${locale}/confirmation?email=${encodeURIComponent(email)}`);
    } catch {
      setSubmitError(t("errors.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const isLastPage = page === total - 1;

  // ---- Render: email step ----------------------------------------------------
  if (step === "email") {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold">{t("test.emailStepTitle")}</h1>
          <p className="text-ink/80">{t("test.emailStepBody")}</p>
        </header>

        <section className="card space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">
            {t("test.emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("test.emailPlaceholder")}
            className={`field ${showErrors && !emailValid ? "border-red-400" : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {showErrors && !emailValid && (
            <p className="text-sm text-red-600">{t("test.emailInvalid")}</p>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-accent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{t("test.emailConsent")}</span>
          </label>
        </section>

        <nav className="flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={continueToQuestions} className="btn-primary">
            {t("test.continueToQuestions")} →
          </button>
        </nav>
      </div>
    );
  }

  // ---- Render: questions step ------------------------------------------------
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{t("test.page", { current: page + 1, total })}</span>
          <span>{t("test.progress", { percent })}</span>
        </div>
        <div className="progress-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted">
          {t("test.saveDraft")} · {t("test.deliveringTo", { email })}
        </p>
      </header>

      <div className="space-y-4">
        {pageQuestions.map((q) => (
          <QuestionField
            key={q.id}
            q={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
            invalid={showErrors && q.required && !isAnswered(q, answers[q.id])}
          />
        ))}
      </div>

      {submitError && <p role="alert" className="text-sm text-red-600">{submitError}</p>}

      <nav className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={goBack} className="btn-secondary">
          ← {t("test.back")}
        </button>
        {isLastPage ? (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "…" : t("test.submit")}
          </button>
        ) : (
          <button type="button" onClick={goNext} className="btn-primary">
            {t("test.next")} →
          </button>
        )}
      </nav>
    </div>
  );
}
