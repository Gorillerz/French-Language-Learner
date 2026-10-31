import { conditional } from "./conditional";
import { expressingCause } from "./expressingCause";
import { pastTenses } from "./pastTenses";
import { pronouns } from "./pronouns";
import { subjunctive } from "./subjunctive";
import type { GrammarConcept } from "./types";
import { verbPrepositions } from "./verbPrepositions";

export type { GrammarConcept, GrammarSentence, TranslatedSentence } from "./types";

export const grammarConcepts: GrammarConcept[] = [
  pastTenses,
  pronouns,
  verbPrepositions,
  conditional,
  subjunctive,
  expressingCause,
];
