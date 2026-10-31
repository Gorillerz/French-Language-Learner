import type { CuratedTopic } from "./types";

export const pronounsQuestions: CuratedTopic = {
  topicId: "pronouns",
  kind: "grammar",
  questions: [
    { slug: "01", format: "complete", prompt: "Tu vois Marie ? Oui, je ___ vois.", answer: "la", distractors: ["lui", "le", "en"] },
    { slug: "02", format: "complete", prompt: "Tu parles à Paul ? Oui, je ___ parle.", answer: "lui", distractors: ["le", "y", "en"] },
    { slug: "03", format: "complete", prompt: "Tu vas à Lyon ? Oui, ___ demain.", answer: "j'y vais", distractors: ["j'en vais", "je lui vais", "je le vais"] },
    { slug: "04", format: "complete", prompt: "Tu as des enfants ? Oui, ___ ai deux.", answer: "j'en", distractors: ["je les", "j'y", "je leur"] },
    { slug: "05", format: "to-french", prompt: "Give it to me.", answer: "Donne-le-moi.", distractors: ["Donne-moi-le.", "Le donne-moi.", "Donne-lui-le."] },
    { slug: "06", format: "to-french", prompt: "I gave it to her.", answer: "Je le lui ai donné.", distractors: ["Je lui l'ai donné.", "Je l'ai lui donné.", "Je le la ai donné."] },
    { slug: "07", format: "complete", prompt: "Mes vacances ? ___ pense souvent.", answer: "J'y", distractors: ["Je leur", "Je les", "J'en"] },
    { slug: "08", format: "complete", prompt: "Ma mère me manque : je pense souvent ___.", answer: "à elle", distractors: ["lui", "y", "la"] },
    { slug: "09", format: "complete", prompt: "Les enfants ? Ne ___ dis pas la vérité.", answer: "leur", distractors: ["les", "lui", "y"] },
    { slug: "10", format: "complete", prompt: "Vos clés ? Je ne ___ ai pas vues.", answer: "les", distractors: ["leur", "en", "y"] },
    { slug: "11", format: "complete", prompt: "Ces fleurs, je les ai ___ ce matin.", answer: "achetées", distractors: ["acheté", "achetés", "achetée"] },
    { slug: "12", format: "complete", prompt: "Des pommes ? J'en ai ___ trois.", answer: "acheté", distractors: ["achetées", "achetés", "achetée"] },
    { slug: "13", format: "to-english", prompt: "Il m'en a parlé.", answer: "He told me about it.", distractors: ["He talked to her about it.", "He told me to leave.", "He didn't speak to me."] },
    { slug: "14", format: "to-french", prompt: "Don't give it to them.", answer: "Ne le leur donne pas.", distractors: ["Ne leur le donne pas.", "Ne donne-le-leur pas.", "Ne le les donne pas."] },
    { slug: "15", format: "to-english", prompt: "Il y en a beaucoup.", answer: "There are a lot of them.", distractors: ["He has many there.", "There aren't many of them.", "They are over there."] },
    { slug: "16", format: "complete", prompt: "___ tout de suite, il t'attend !", answer: "Vas-y", distractors: ["Va-y", "Y va", "Va-le"] },
    { slug: "17", format: "complete", prompt: "Prends-___ deux, il y en a assez.", answer: "en", distractors: ["leur", "y", "lui"] },
    { slug: "18", format: "complete", prompt: "Téléphone à Julie et dis-___ de venir.", answer: "lui", distractors: ["la", "le", "y"] },
    { slug: "19", format: "complete", prompt: "Ton frère ? Je ___ à la gare.", answer: "l'ai vu", distractors: ["lui ai vu", "y ai vu", "en ai vu"] },
    { slug: "20", format: "to-english", prompt: "Je vous les enverrai demain.", answer: "I'll send them to you tomorrow.", distractors: ["I'll send you to them tomorrow.", "You'll send them to me tomorrow.", "I sent them to you yesterday."] },
  ],
};
