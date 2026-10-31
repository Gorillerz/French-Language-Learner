import { useState } from "react";
import { FollowUpQuestion } from "../ai/FollowUpQuestion";
import type { QuizAttempt } from "../db";
import type { PracticeQuestion } from "./content";
import { formats } from "./formats";
import { useQuizReview } from "./store";

type Props = {
  sessionId: string;
  backLabel: string;
  onBack: () => void;
};

/** What was asked and answered in one quiz. Only answered questions are ever shown. */
export function QuizReview({ sessionId, backLabel, onBack }: Props) {
  const reviewed = useQuizReview(sessionId);

  return (
    <section className="area-content" aria-label="Quiz review">
      <h3>Quiz review</h3>
      {reviewed && (
        <ol className="row-list">
          {reviewed.map(({ attempt, question }, index) => (
            <li key={attempt.id}>
              <article className="report-row review-question" aria-label={`Question ${index + 1}`}>
                {question ? (
                  <ReviewedQuestion attempt={attempt} question={question} />
                ) : (
                  <p className="muted">This question has not reached this device yet.</p>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="link-button" onClick={onBack}>
        {backLabel}
      </button>
    </section>
  );
}

/** Attempts from before quiz review kept only whether the answer was right. */
function answerGiven({ chosenOption, isCorrect }: QuizAttempt, { answer }: PracticeQuestion) {
  return chosenOption ?? (isCorrect ? answer : null);
}

type QuestionProps = { attempt: QuizAttempt; question: PracticeQuestion };

function ReviewedQuestion({ attempt, question }: QuestionProps) {
  const [isAsking, setIsAsking] = useState(false);
  const { instruction, promptLang, optionLang } = formats[question.format];
  const { answer, distractors, explanations } = question;
  const chosen = answerGiven(attempt, question);
  // Without explanations the other options have nothing to teach here.
  const shown = explanations
    ? [answer, ...distractors]
    : [...new Set(chosen === null ? [answer] : [answer, chosen])];

  return (
    <>
      <p className="muted">{instruction}</p>
      <h4 className="review-prompt" lang={promptLang}>
        {question.prompt}
      </h4>
      <p>{attempt.isCorrect ? "Correct" : "Incorrect"}</p>
      <ul className="row-list" aria-label="Options">
        {shown.map((option) => (
          <li key={option} className={optionClass(option, answer, chosen)}>
            <span className="report-name" lang={optionLang}>
              {option}
            </span>
            {option === answer && <span>Correct answer</span>}
            {option === chosen && <span>Your answer</span>}
            {explanations?.[option] && <span>{explanations[option]}</span>}
          </li>
        ))}
      </ul>
      {chosen === null && <p className="muted">Your answer to this question was not recorded.</p>}
      {isAsking ? (
        <FollowUpQuestion quizQuestion={followUpContext(question, chosen)} />
      ) : (
        <button type="button" className="link-button" onClick={() => setIsAsking(true)}>
          Ask AI about this question
        </button>
      )}
    </>
  );
}

function optionClass(option: string, answer: string, chosen: string | null) {
  if (option === answer) return "review-option option-correct";
  return option === chosen ? "review-option option-incorrect" : "review-option";
}

/** Only this question, as the Learner saw it. */
function followUpContext(
  { format, prompt, answer, distractors, explanations }: PracticeQuestion,
  chosen: string | null,
) {
  const options = [answer, ...distractors].map((option) => {
    const label = option === answer ? `${option} (correct)` : option;
    const explanation = explanations?.[option];
    return `- ${label}${explanation ? `: ${explanation}` : ""}`;
  });
  return [
    `Quiz question (${formats[format].instruction}): ${prompt}`,
    `Options:\n${options.join("\n")}`,
    `The Learner chose: ${chosen ?? "not recorded"}`,
  ].join("\n");
}
