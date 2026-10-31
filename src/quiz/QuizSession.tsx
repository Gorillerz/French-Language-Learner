import { useState } from "react";
import { formats } from "./formats";
import { QuizReview } from "./QuizReview";
import { recordAttempt, type QuizQuestion } from "./store";

type Props = {
  /** The questions as they stood when the quiz began. */
  questions: QuizQuestion[];
  topicName: (topicId: string) => string;
  onBack: () => void;
};

export function QuizSession({ questions, topicName, onBack }: Props) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [position, setPosition] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [ended, setEnded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const question = questions[position];

  if (isReviewing) {
    return (
      <QuizReview
        sessionId={sessionId}
        backLabel="Back to result"
        onBack={() => setIsReviewing(false)}
      />
    );
  }

  if (ended || !question) {
    const answeredCount = position + (picked === null ? 0 : 1);
    return (
      <section className="vocabulary">
        <p role="status">
          {answeredCount === 0
            ? "No questions answered"
            : `${correctCount} of ${answeredCount} correct`}
        </p>
        {answeredCount > 0 && (
          <button type="button" className="primary-button" onClick={() => setIsReviewing(true)}>
            Review answers
          </button>
        )}
        <button type="button" className="link-button" onClick={onBack}>
          Back to quizzes
        </button>
      </section>
    );
  }

  const { instruction, promptLang, optionLang } = formats[question.format];
  const isLast = position === questions.length - 1;

  async function pick(option: string) {
    if (!question) return;
    const isCorrect = option === question.answer;
    setIsSaving(true);
    setSaveFailed(false);
    try {
      // Show the outcome only once it's saved, so nothing shown as done can be
      // lost by closing the app straight afterwards.
      await recordAttempt({ question, isCorrect, chosenOption: option, sessionId });
      setPicked(option);
      if (isCorrect) setCorrectCount((count) => count + 1);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  function next() {
    setPicked(null);
    setPosition(position + 1);
  }

  function optionClass(option: string) {
    if (picked === null) return "option-button";
    if (option === question?.answer) return "option-button option-correct";
    return option === picked ? "option-button option-incorrect" : "option-button";
  }

  return (
    <section className="vocabulary">
      <article className="flashcard" role="region" aria-label="Quiz question">
        <div className="session-bar">
          <p className="muted">
            Question {position + 1} of {questions.length}
          </p>
          <button type="button" className="link-button" onClick={() => setEnded(true)}>
            End quiz
          </button>
        </div>
        <p className="muted">{topicName(question.topicId)}</p>
        <p>{instruction}</p>
        <h3 className="quiz-prompt" lang={promptLang}>
          {question.prompt}
        </h3>
        <div role="group" aria-label="Answer options" className="option-buttons">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              className={optionClass(option)}
              lang={optionLang}
              disabled={picked !== null || isSaving}
              onClick={() => void pick(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {saveFailed && <p role="alert">That answer couldn't be saved. Please try again.</p>}
        {picked !== null && (
          <>
            <p role="status">
              {picked === question.answer ? "Correct" : `Incorrect. The answer is: ${question.answer}`}
            </p>
            <button type="button" className="primary-button" onClick={next}>
              {isLast ? "See result" : "Next question"}
            </button>
          </>
        )}
      </article>
    </section>
  );
}
