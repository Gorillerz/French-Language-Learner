import type { GrammarConcept } from "./types";

export const verbPrepositions: GrammarConcept = {
  id: "verb-prepositions",
  title: "Verbs and their prepositions",
  summary: "Which verbs take à, de or nothing at all, before a noun or an infinitive.",
  explanation: [
    "Each French verb has a fixed pattern that often differs from English, so learn the verb together with what follows it.",
    "Some verbs take a direct object where English needs a preposition: chercher (look for), attendre (wait for), écouter (listen to), regarder (look at), payer (pay for).",
    "Others need à or de where English has nothing: téléphoner à, répondre à, ressembler à, se servir de, avoir besoin de, profiter de.",
    "Before an infinitive, some verbs take nothing (vouloir, devoir, pouvoir, savoir, aller), some take à (commencer à, réussir à, hésiter à, s'habituer à) and some take de (décider de, essayer de, oublier de, refuser de, arrêter de).",
    "Asking or telling someone to do something usually follows the pattern à quelqu'un de faire: demander, conseiller, dire, proposer, permettre.",
    "Watch out for manquer, which reverses the roles: Tu me manques means I miss you. And penser à means to think about, while penser de asks for an opinion.",
  ],
  examples: [
    {
      fr: "J'attends le bus depuis vingt minutes.",
      en: "I've been waiting for the bus for twenty minutes.",
    },
    { fr: "Elle ressemble beaucoup à sa mère.", en: "She looks a lot like her mother." },
    { fr: "Il a décidé de changer de travail.", en: "He decided to change jobs." },
    { fr: "Je lui ai conseillé de prendre un avocat.", en: "I advised him to get a lawyer." },
    { fr: "Tu me manques.", en: "I miss you." },
    { fr: "Que penses-tu de ce film ?", en: "What do you think of this film?" },
  ],
  sentences: [
    {
      id: "verb-prepositions-01",
      fr: "Je cherche mes lunettes depuis ce matin.",
      en: "I've been looking for my glasses since this morning.",
    },
    {
      id: "verb-prepositions-02",
      fr: "Il n'a pas encore répondu à mon message.",
      en: "He hasn't replied to my message yet.",
    },
    {
      id: "verb-prepositions-03",
      fr: "Ma famille me manque beaucoup depuis que j'habite à Paris.",
      en: "I've missed my family a lot since I've been living in Paris.",
    },
    {
      id: "verb-prepositions-04",
      fr: "Nous avons réussi à convaincre le client.",
      en: "We managed to convince the client.",
    },
    {
      id: "verb-prepositions-05",
      fr: "J'ai oublié de fermer la porte à clé.",
      en: "I forgot to lock the door.",
    },
    {
      id: "verb-prepositions-06",
      fr: "La directrice nous a demandé de finir le rapport avant vendredi.",
      en: "The director asked us to finish the report before Friday.",
    },
    {
      id: "verb-prepositions-07",
      fr: "Elle hésite à accepter cette offre.",
      en: "She's hesitant to accept this offer.",
    },
    {
      id: "verb-prepositions-08",
      fr: "Tu vas t'habituer à te lever tôt.",
      en: "You'll get used to getting up early.",
    },
    {
      id: "verb-prepositions-09",
      fr: "Je me sers de cet outil tous les jours.",
      en: "I use this tool every day.",
    },
    {
      id: "verb-prepositions-10",
      fr: "Ils ont payé le repas et sont partis sans dire au revoir.",
      en: "They paid for the meal and left without saying goodbye.",
    },
    {
      id: "verb-prepositions-11",
      fr: "Je vous remercie de m'avoir aidé.",
      en: "Thank you for helping me.",
    },
    {
      id: "verb-prepositions-12",
      fr: "Il a arrêté de fumer il y a deux ans.",
      en: "He stopped smoking two years ago.",
    },
  ],
};
