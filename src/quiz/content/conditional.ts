import type { CuratedTopic } from "./types";

export const conditionalQuestions: CuratedTopic = {
  topicId: "conditional",
  kind: "grammar",
  questions: [
    { slug: "01", format: "complete", prompt: "Si j'avais le temps, je ___ plus souvent.", answer: "lirais", distractors: ["lirai", "lisais", "lis"] },
    { slug: "02", format: "complete", prompt: "S'il pleut, nous ___ à la maison.", answer: "resterons", distractors: ["resterions", "restions", "serions restés"] },
    { slug: "03", format: "complete", prompt: "Si tu ___ riche, que ferais-tu ?", answer: "étais", distractors: ["serais", "es", "seras"] },
    { slug: "04", format: "complete", prompt: "Si j'avais su, je ___ venu plus tôt.", answer: "serais", distractors: ["aurais", "étais", "suis"] },
    { slug: "05", format: "complete", prompt: "Si nous ___ plus tôt, nous n'aurions pas raté le train.", answer: "étions partis", distractors: ["partirions", "serions partis", "partons"] },
    { slug: "06", format: "to-french", prompt: "I would like a coffee, please.", answer: "Je voudrais un café, s'il vous plaît.", distractors: ["Je voudrai un café, s'il vous plaît.", "Je veux un café, s'il vous plaît.", "Je vais vouloir un café, s'il vous plaît."] },
    { slug: "07", format: "to-english", prompt: "Tu aurais dû m'appeler.", answer: "You should have called me.", distractors: ["You should call me.", "You could have called me.", "You will have to call me."] },
    { slug: "08", format: "to-french", prompt: "You should see this film.", answer: "Tu devrais voir ce film.", distractors: ["Tu devras voir ce film.", "Tu dois voir ce film.", "Tu aurais dû voir ce film."] },
    { slug: "09", format: "complete", prompt: "Il m'a dit qu'il ___ le lendemain.", answer: "viendrait", distractors: ["viendra", "vient", "vienne"] },
    { slug: "10", format: "complete", prompt: "Je ___ bien des vacances en ce moment.", answer: "prendrais", distractors: ["prendrai", "prends", "prenne"] },
    { slug: "11", format: "complete", prompt: "Si elle venait, je ___ content.", answer: "serais", distractors: ["serai", "suis", "sois"] },
    { slug: "12", format: "to-english", prompt: "Si j'étais toi, je partirais.", answer: "If I were you, I would leave.", distractors: ["If you were me, I would leave.", "If I am you, I will leave.", "If I had been you, I would have left."] },
    { slug: "13", format: "complete", prompt: "Au cas où tu ___ en retard, préviens-moi.", answer: "serais", distractors: ["seras", "es", "sois"] },
    { slug: "14", format: "complete", prompt: "À ta place, j'___ accepté cette offre.", answer: "aurais", distractors: ["aurai", "étais", "avais"] },
    { slug: "15", format: "complete", prompt: "Que ferais-tu si tu ___ ton travail ?", answer: "perdais", distractors: ["perdrais", "perds", "perdras"] },
    { slug: "16", format: "complete", prompt: "Si tu ___ venir, appelle-moi.", answer: "veux", distractors: ["voudrais", "voudras", "voudrait"] },
    { slug: "17", format: "to-french", prompt: "If it had rained, we would have stayed.", answer: "S'il avait plu, nous serions restés.", distractors: ["S'il aurait plu, nous serions restés.", "S'il pleuvait, nous resterions.", "S'il a plu, nous serons restés."] },
    { slug: "18", format: "to-english", prompt: "On dirait qu'il va pleuvoir.", answer: "It looks like it's going to rain.", distractors: ["They said it was going to rain.", "We would say it's raining.", "It rained yesterday, as they said."] },
    { slug: "19", format: "to-french", prompt: "It would be better to leave now.", answer: "Il vaudrait mieux partir maintenant.", distractors: ["Il vaut mieux partir maintenant.", "Il voudrait mieux partir maintenant.", "Il vaudra mieux partir maintenant."] },
    { slug: "20", format: "complete", prompt: "Si tu avais écouté, tu ___ la réponse maintenant.", answer: "saurais", distractors: ["aurais su", "sais", "sauras"] },
  ],
};
