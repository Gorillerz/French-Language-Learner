import { useLiveQuery } from "dexie-react-hooks";
import { useId, useMemo, useState, type ReactNode } from "react";
import { db } from "../db";
import {
  allTime,
  buildProgressReport,
  type DateRange,
  type FlashcardTopicResult,
  type QuizTopicResult,
  type SessionResult,
} from "./report";

function useActivity() {
  return useLiveQuery(async () => {
    const [attempts, ratings, collections] = await Promise.all([
      db.quizAttempts.toArray(),
      db.flashcardRatings.toArray(),
      db.collections.orderBy("position").toArray(),
    ]);
    return { attempts, ratings, collections };
  });
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export function ProgressArea() {
  const activity = useActivity();
  const [range, setRange] = useState<DateRange>(allTime);
  const report = useMemo(() => activity && buildProgressReport(activity, range), [activity, range]);

  if (!activity || !report) return null;
  if (activity.attempts.length === 0 && activity.ratings.length === 0) {
    return (
      <section className="vocabulary">
        <p>No study recorded yet.</p>
      </section>
    );
  }

  const { quizzes, flashcards, sessions } = report;
  const isAllTime = range.from === "" && range.to === "";
  const hasQuizzes = quizzes.collections.length + quizzes.grammar.length > 0;
  const hasFlashcards = flashcards.collections.length + flashcards.grammar.length > 0;

  return (
    <section className="vocabulary">
      <div className="date-range">
        <label>
          From
          <input
            type="date"
            value={range.from}
            onChange={(event) => setRange({ ...range, from: event.target.value })}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={range.to}
            onChange={(event) => setRange({ ...range, to: event.target.value })}
          />
        </label>
      </div>
      {isAllTime ? (
        <p className="muted">Showing all time.</p>
      ) : (
        <button type="button" className="link-button" onClick={() => setRange(allTime)}>
          Show all time
        </button>
      )}

      {sessions.length === 0 && <p>No study in this date range.</p>}

      {hasQuizzes && <TopicReport title="Quiz results" groups={quizzes} Row={QuizRow} />}
      {hasFlashcards && (
        <TopicReport
          title="Flashcard ratings"
          note="Self-ratings run from 1 (forgot it) to 4 (effortless)."
          groups={flashcards}
          Row={FlashcardRow}
        />
      )}
      {sessions.length > 0 && <SessionList sessions={sessions} />}
    </section>
  );
}

type TopicReportProps<Result> = {
  title: string;
  note?: string;
  groups: { collections: Result[]; grammar: Result[] };
  Row: (props: { result: Result }) => ReactNode;
};

function TopicReport<Result extends { topicId: string }>({
  title,
  note,
  groups,
  Row,
}: TopicReportProps<Result>) {
  const headingId = useId();
  const lists = [
    { label: "Vocabulary collections", results: groups.collections },
    { label: "Grammar concepts", results: groups.grammar },
  ];

  return (
    <section className="report-section" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      {note && <p className="muted">{note}</p>}
      {lists.map(
        ({ label, results }) =>
          results.length > 0 && (
            <div key={label} className="report-section">
              <h4>{label}</h4>
              <ul className="row-list" aria-label={label}>
                {results.map((result) => (
                  <li key={result.topicId} className="report-row">
                    <Row result={result} />
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
    </section>
  );
}

function QuizRow({ result }: { result: QuizTopicResult }) {
  return (
    <>
      <span className="report-name">{result.name}</span>
      <span>
        {result.percentCorrect}% correct · {plural(result.attempts, "attempt")}
      </span>
    </>
  );
}

function FlashcardRow({ result }: { result: FlashcardTopicResult }) {
  const counts = result.counts.map((count, index) => `${index + 1}: ${count}`).join(" · ");
  return (
    <>
      <span className="report-name">{result.name}</span>
      <span>
        Average {result.average} · {plural(result.ratings, "rating")}
      </span>
      <span className="muted">Rated {counts}</span>
    </>
  );
}

function SessionList({ sessions }: { sessions: SessionResult[] }) {
  return (
    <section className="report-section" aria-labelledby="sessions-heading">
      <h3 id="sessions-heading">Sessions</h3>
      <ul className="row-list" aria-label="Sessions">
        {sessions.map((session) => (
          <li key={session.sessionId} className="report-row">
            <SessionRow session={session} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionRow({ session: { startedAt, topics, quiz, flashcards } }: { session: SessionResult }) {
  const kinds = [quiz && "Quiz", flashcards && "Flashcards"].filter(Boolean).join(" and ");
  const started = new Date(startedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <span className="report-name">
        {kinds}: {topics.join(", ")}
      </span>
      <span className="muted">{started}</span>
      {quiz && (
        <span>
          {quiz.correct} of {quiz.attempts} correct ({quiz.percentCorrect}%)
        </span>
      )}
      {flashcards && (
        <span>
          Average {flashcards.average} from {plural(flashcards.ratings, "rating")}
        </span>
      )}
    </>
  );
}
