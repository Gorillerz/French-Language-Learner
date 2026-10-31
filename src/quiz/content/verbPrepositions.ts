import type { CuratedTopic } from "./types";

export const verbPrepositionsQuestions: CuratedTopic = {
  topicId: "verb-prepositions",
  kind: "grammar",
  questions: [
    { slug: "01", format: "complete", prompt: "J'attends ___ bus depuis vingt minutes.", answer: "le", distractors: ["pour le", "au", "du"] },
    { slug: "02", format: "complete", prompt: "Elle ressemble ___ sa mère.", answer: "à", distractors: ["de", "comme", "sur"] },
    { slug: "03", format: "complete", prompt: "Nous avons décidé ___ partir plus tôt.", answer: "de", distractors: ["à", "pour", "par"] },
    { slug: "04", format: "complete", prompt: "Il a réussi ___ trouver un travail.", answer: "à", distractors: ["de", "pour", "en"] },
    { slug: "05", format: "complete", prompt: "J'ai besoin ___ ton aide.", answer: "de", distractors: ["à", "pour", "par"] },
    { slug: "06", format: "complete", prompt: "Je vais téléphoner ___ mon frère ce soir.", answer: "à", distractors: ["de", "pour", "vers"] },
    { slug: "07", format: "complete", prompt: "Il a oublié ___ fermer la porte.", answer: "de", distractors: ["à", "par", "pour"] },
    { slug: "08", format: "complete", prompt: "Je me suis habitué ___ vivre seul.", answer: "à", distractors: ["de", "pour", "en"] },
    { slug: "09", format: "complete", prompt: "Demande ___ Paul de venir.", answer: "à", distractors: ["de", "par", "pour"] },
    { slug: "10", format: "to-french", prompt: "I miss you.", answer: "Tu me manques.", distractors: ["Je te manque.", "Je manque de toi.", "Tu manques de moi."] },
    { slug: "11", format: "complete", prompt: "Que penses-tu ___ ce film ?", answer: "de", distractors: ["à", "sur", "pour"] },
    { slug: "12", format: "complete", prompt: "Je pense souvent ___ mon enfance.", answer: "à", distractors: ["de", "sur", "pour"] },
    { slug: "13", format: "complete", prompt: "Il cherche ___ clés partout.", answer: "ses", distractors: ["pour ses", "à ses", "de ses"] },
    { slug: "14", format: "complete", prompt: "Elle écoute ___ radio dans la cuisine.", answer: "la", distractors: ["à la", "de la", "pour la"] },
    { slug: "15", format: "complete", prompt: "Il m'a conseillé ___ prendre le train.", answer: "de", distractors: ["à", "pour", "par"] },
    { slug: "16", format: "complete", prompt: "Elle s'intéresse ___ la politique.", answer: "à", distractors: ["de", "pour", "sur"] },
    { slug: "17", format: "complete", prompt: "Nous profitons ___ beau temps.", answer: "du", distractors: ["au", "le", "pour le"] },
    { slug: "18", format: "to-english", prompt: "Il a refusé de répondre à la question.", answer: "He refused to answer the question.", distractors: ["He agreed to answer the question.", "He forgot to answer the question.", "He refused to ask the question."] },
    { slug: "19", format: "to-french", prompt: "She told him to wait.", answer: "Elle lui a dit d'attendre.", distractors: ["Elle l'a dit d'attendre.", "Elle lui a dit à attendre.", "Elle lui a dit attendre."] },
    { slug: "20", format: "complete", prompt: "Je me sers ___ cet outil tous les jours.", answer: "de", distractors: ["à", "avec", "par"] },
  ],
};
