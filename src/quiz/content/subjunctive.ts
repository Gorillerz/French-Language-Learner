import type { CuratedTopic } from "./types";

export const subjunctiveQuestions: CuratedTopic = {
  topicId: "subjunctive",
  kind: "grammar",
  questions: [
    { slug: "01", format: "complete", prompt: "Il faut que tu ___ à l'heure.", answer: "sois", distractors: ["es", "seras", "être"] },
    { slug: "02", format: "complete", prompt: "Je veux que vous ___ ce travail.", answer: "fassiez", distractors: ["faites", "ferez", "faire"] },
    { slug: "03", format: "complete", prompt: "Bien qu'il ___ fatigué, il continue.", answer: "soit", distractors: ["est", "sera", "était"] },
    { slug: "04", format: "complete", prompt: "Je pense qu'elle ___ raison.", answer: "a", distractors: ["ait", "aie", "avoir"] },
    { slug: "05", format: "complete", prompt: "Je ne pense pas qu'elle ___ raison.", answer: "ait", distractors: ["a", "aura", "avoir"] },
    { slug: "06", format: "complete", prompt: "J'espère que tu ___ bientôt.", answer: "viendras", distractors: ["viennes", "venir", "vienne"] },
    { slug: "07", format: "complete", prompt: "Je suis content que tu ___ venu.", answer: "sois", distractors: ["es", "étais", "seras"] },
    { slug: "08", format: "complete", prompt: "Attends-moi jusqu'à ce que je ___.", answer: "revienne", distractors: ["reviens", "reviendrai", "revenir"] },
    { slug: "09", format: "complete", prompt: "Je te le dis pour que tu le ___.", answer: "saches", distractors: ["sais", "sauras", "savoir"] },
    { slug: "10", format: "complete", prompt: "Il est possible qu'il ___ ce soir.", answer: "pleuve", distractors: ["pleut", "pleuvra", "pleuvoir"] },
    { slug: "11", format: "to-french", prompt: "I want to come.", answer: "Je veux venir.", distractors: ["Je veux que je vienne.", "Je veux que je viens.", "Je veux de venir."] },
    { slug: "12", format: "to-french", prompt: "I want you to come.", answer: "Je veux que tu viennes.", distractors: ["Je veux que tu viens.", "Je veux toi venir.", "Je te veux venir."] },
    { slug: "13", format: "complete", prompt: "Il est certain qu'il ___ là demain.", answer: "sera", distractors: ["soit", "sois", "être"] },
    { slug: "14", format: "complete", prompt: "Avant que tu ___, je dois te parler.", answer: "partes", distractors: ["pars", "partiras", "partir"] },
    { slug: "15", format: "complete", prompt: "Après que tu ___ parti, elle a pleuré.", answer: "es", distractors: ["sois", "seras", "être"] },
    { slug: "16", format: "complete", prompt: "Je doute qu'il ___ la réponse.", answer: "sache", distractors: ["sait", "saura", "savoir"] },
    { slug: "17", format: "complete", prompt: "Elle a peur que nous ___ en retard.", answer: "soyons", distractors: ["sommes", "serons", "soyions"] },
    { slug: "18", format: "complete", prompt: "Il faut que nous ___ à la banque.", answer: "allions", distractors: ["allons", "irons", "aillons"] },
    { slug: "19", format: "to-english", prompt: "Je suis désolé que tu n'aies pas pu venir.", answer: "I'm sorry you couldn't come.", distractors: ["I'm sorry I couldn't come.", "I'm glad you couldn't come.", "I'm sorry you didn't want to come."] },
    { slug: "20", format: "complete", prompt: "Il sort sans que ses parents le ___.", answer: "sachent", distractors: ["savent", "sauront", "sache"] },
  ],
};
