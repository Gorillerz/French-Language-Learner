import type { CuratedTopic } from "./types";

export const pastTensesQuestions: CuratedTopic = {
  topicId: "past-tenses",
  kind: "grammar",
  questions: [
    { slug: "01", format: "complete", prompt: "Quand je suis arrivé, il ___.", answer: "pleuvait", distractors: ["a plu", "pleut", "pleuvra"] },
    { slug: "02", format: "complete", prompt: "Hier, nous ___ au cinéma.", answer: "sommes allés", distractors: ["avons allé", "sommes allé", "étions allé"] },
    { slug: "03", format: "complete", prompt: "Elle est ___ à six heures ce matin.", answer: "partie", distractors: ["parti", "partis", "partir"] },
    { slug: "04", format: "complete", prompt: "Les lettres que j'ai ___ sont sur la table.", answer: "écrites", distractors: ["écrit", "écrits", "écrite"] },
    { slug: "05", format: "complete", prompt: "Quand j'étais petit, j'___ chez ma grand-mère tous les étés.", answer: "allais", distractors: ["irais", "ai allé", "irai"] },
    { slug: "06", format: "to-french", prompt: "I was reading when the phone rang.", answer: "Je lisais quand le téléphone a sonné.", distractors: ["J'ai lu quand le téléphone sonnait.", "J'ai lu quand le téléphone a sonné.", "J'avais lu quand le téléphone a sonné."] },
    { slug: "07", format: "complete", prompt: "Quand nous sommes arrivés, le film ___ déjà commencé.", answer: "avait", distractors: ["a", "était", "aura"] },
    { slug: "08", format: "to-english", prompt: "Il avait oublié ses clés.", answer: "He had forgotten his keys.", distractors: ["He has forgotten his keys.", "He forgets his keys.", "He was forgetting his keys."] },
    { slug: "09", format: "complete", prompt: "Ils se sont ___ à la gare.", answer: "rencontrés", distractors: ["rencontré", "rencontrer", "rencontrait"] },
    { slug: "10", format: "complete", prompt: "Elle s'est ___ les mains.", answer: "lavé", distractors: ["lavée", "lavés", "laver"] },
    { slug: "11", format: "complete", prompt: "___ trois ans à Lyon, puis je suis parti.", answer: "J'ai vécu", distractors: ["Je vivais", "Je vis", "Je vivrai"] },
    { slug: "12", format: "to-english", prompt: "Il venait de partir quand tu as appelé.", answer: "He had just left when you called.", distractors: ["He left after you called.", "He was about to leave when you called.", "He came back when you called."] },
    { slug: "13", format: "complete", prompt: "Elle a ___ la valise au grenier.", answer: "monté", distractors: ["montée", "monter", "montait"] },
    { slug: "14", format: "complete", prompt: "Nous ___ rentrés tard hier soir.", answer: "sommes", distractors: ["avons", "êtes", "ont"] },
    { slug: "15", format: "complete", prompt: "Pendant que je cuisinais, les enfants ___ dans le jardin.", answer: "jouaient", distractors: ["jouent", "joueront", "joueraient"] },
    { slug: "16", format: "to-french", prompt: "She went out at eight.", answer: "Elle est sortie à huit heures.", distractors: ["Elle a sorti à huit heures.", "Elle sortait à huit heures.", "Elle est sorti à huit heures."] },
    { slug: "17", format: "complete", prompt: "Le train ___ quand nous sommes arrivés sur le quai : nous l'avons raté.", answer: "était déjà parti", distractors: ["est déjà parti", "part déjà", "partira déjà"] },
    { slug: "18", format: "complete", prompt: "Tous les matins, il ___ un café avant de partir.", answer: "prenait", distractors: ["a pris", "avait pris", "prendra"] },
    { slug: "19", format: "to-english", prompt: "Je l'ai vue hier.", answer: "I saw her yesterday.", distractors: ["I saw him yesterday.", "I see her every day.", "I had seen her the day before."] },
    { slug: "20", format: "complete", prompt: "Soudain, la lumière ___.", answer: "s'est éteinte", distractors: ["s'éteignait", "s'était éteinte", "s'éteindra"] },
  ],
};
