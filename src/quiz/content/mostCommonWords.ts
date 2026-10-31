import type { CuratedTopic } from "./types";

export const mostCommonWordsQuestions: CuratedTopic = {
  topicId: "most-common-words",
  kind: "vocabulary",
  questions: [
    { slug: "01", format: "complete", prompt: "Nous ___ très contents d'être ici.", answer: "sommes", distractors: ["avons", "êtes", "sont"] },
    { slug: "02", format: "to-english", prompt: "Le livre dont je parle est sur la table.", answer: "The book I'm talking about is on the table.", distractors: ["The book I'm reading is on the table.", "The book I bought is on the table.", "The book you're talking about is under the table."] },
    { slug: "03", format: "complete", prompt: "Elle ___ trente ans et deux enfants.", answer: "a", distractors: ["est", "as", "ont"] },
    { slug: "04", format: "to-french", prompt: "I don't know.", answer: "Je ne sais pas.", distractors: ["Je ne sais plus.", "Je ne peux pas.", "Je ne veux pas."] },
    { slug: "05", format: "complete", prompt: "Il ne fume ___ depuis deux ans.", answer: "plus", distractors: ["aucun", "encore", "très"] },
    { slug: "06", format: "to-english", prompt: "Il a raison.", answer: "He is right.", distractors: ["He has a reason.", "He is reasonable.", "He is wrong."] },
    { slug: "07", format: "complete", prompt: "Il ___ du courage pour dire la vérité.", answer: "faut", distractors: ["doit", "sait", "va"] },
    { slug: "08", format: "to-english", prompt: "Personne n'est venu.", answer: "Nobody came.", distractors: ["A person came.", "Everybody came.", "The person has come."] },
    { slug: "09", format: "complete", prompt: "Je vis à Lyon ___ dix ans.", answer: "depuis", distractors: ["pendant", "dans", "pour"] },
    { slug: "10", format: "complete", prompt: "Quel ___ fait-il aujourd'hui ?", answer: "temps", distractors: ["jour", "monde", "an"] },
    { slug: "11", format: "to-french", prompt: "the last time", answer: "la dernière fois", distractors: ["le dernier temps", "la première fois", "la dernière heure"] },
    { slug: "12", format: "complete", prompt: "Je ne trouve ___ solution à ce problème.", answer: "aucune", distractors: ["aucun", "personne", "rien"] },
    { slug: "13", format: "to-english", prompt: "Elle m'a rendu mon livre.", answer: "She gave my book back to me.", distractors: ["She gave me a new book.", "She made my book better.", "She took my book from me."] },
    { slug: "14", format: "complete", prompt: "Je ___ conduire, mais je n'ai pas de voiture.", answer: "sais", distractors: ["connais", "suis", "ai"] },
    { slug: "15", format: "to-english", prompt: "Il pleut encore.", answer: "It is still raining.", distractors: ["It is no longer raining.", "It has already rained.", "It never rains."] },
    { slug: "16", format: "complete", prompt: "C'est la ville ___ je suis né.", answer: "où", distractors: ["que", "qui", "dont"] },
    { slug: "17", format: "complete", prompt: "Ce n'est pas ma voiture, c'est ___ de mon frère.", answer: "celle", distractors: ["celui", "ce", "cela"] },
    { slug: "18", format: "to-french", prompt: "I have to leave.", answer: "Je dois partir.", distractors: ["Je veux partir.", "Je peux partir.", "Je vais partir."] },
    { slug: "19", format: "complete", prompt: "Cette robe coûte ___ cher que l'autre.", answer: "moins", distractors: ["très", "peu", "bien"] },
    { slug: "20", format: "to-english", prompt: "J'ai passé deux heures à lire.", answer: "I spent two hours reading.", distractors: ["I read at two o'clock.", "I stopped reading two hours ago.", "I've been reading for two days."] },
  ],
};
