import type { GrammarConcept } from "./types";

export const pronouns: GrammarConcept = {
  id: "pronouns",
  title: "Object pronouns, y and en",
  summary: "Replacing people and things, and putting several pronouns in the right order.",
  explanation: [
    "Direct object pronouns (me, te, le, la, nous, vous, les) replace what follows the verb directly. Indirect pronouns (me, te, lui, nous, vous, leur) replace a person after à.",
    "Y replaces à plus a thing, or a place: Tu penses à ton examen ? Oui, j'y pense.",
    "En replaces de plus a thing, and any noun that comes with a quantity: Tu as des frères ? Oui, j'en ai deux.",
    "For people after verbs such as penser à, parler de and se souvenir de, keep a stressed pronoun: je pense à lui, je parle d'elle.",
    "Before the verb, the order is: me, te, se, nous, vous, then le, la, les, then lui, leur, then y, then en. In compound tenses the pronouns go before the auxiliary, and the past participle agrees with a direct object placed before it.",
    "In positive commands the pronouns follow the verb with hyphens, and me and te become moi and toi: Donne-le-moi.",
  ],
  examples: [
    { fr: "Je le lui ai déjà expliqué.", en: "I've already explained it to him." },
    { fr: "Des idées ? J'en ai plusieurs.", en: "Ideas? I have several." },
    { fr: "Cette réunion, j'y vais à contrecœur.", en: "That meeting, I'm going to it reluctantly." },
    { fr: "Tes clés, je les ai trouvées sur la table.", en: "Your keys, I found them on the table." },
    { fr: "Envoie-la-moi dès que possible.", en: "Send it to me as soon as possible." },
  ],
  sentences: [
    { id: "pronouns-01", fr: "Je te l'envoie ce soir.", en: "I'll send it to you this evening." },
    { id: "pronouns-02", fr: "Elle nous en a parlé hier.", en: "She told us about it yesterday." },
    { id: "pronouns-03", fr: "Il y en a encore dans le frigo.", en: "There's still some in the fridge." },
    { id: "pronouns-04", fr: "Ne le lui dis pas tout de suite.", en: "Don't tell him right away." },
    {
      id: "pronouns-05",
      fr: "Les dossiers ? Je les leur ai remis ce matin.",
      en: "The files? I handed them over to them this morning.",
    },
    {
      id: "pronouns-06",
      fr: "Tu te souviens de cette réunion ? Oui, je m'en souviens très bien.",
      en: "Do you remember that meeting? Yes, I remember it very well.",
    },
    {
      id: "pronouns-07",
      fr: "Je pense souvent à elle, mais je n'ose pas l'appeler.",
      en: "I often think about her, but I don't dare call her.",
    },
    { id: "pronouns-08", fr: "Ce projet, j'y tiens beaucoup.", en: "This project really matters to me." },
    { id: "pronouns-09", fr: "Donne-m'en un peu, s'il te plaît.", en: "Give me a little, please." },
    {
      id: "pronouns-10",
      fr: "La lettre que je t'ai écrite, tu l'as reçue ?",
      en: "Did you get the letter I wrote you?",
    },
    {
      id: "pronouns-11",
      fr: "On ne peut pas s'y habituer si vite.",
      en: "You can't get used to it so quickly.",
    },
    {
      id: "pronouns-12",
      fr: "Je n'en ai aucune idée, mais je vais me renseigner.",
      en: "I have no idea, but I'll find out.",
    },
  ],
};
