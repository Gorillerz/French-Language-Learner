import type { GrammarConcept } from "./types";

export const pastTenses: GrammarConcept = {
  id: "past-tenses",
  title: "Past tenses",
  summary: "Choosing between the passé composé, the imparfait and the plus-que-parfait.",
  explanation: [
    "The passé composé moves the story forward. Use it for completed events, especially when you can say when they started, ended, or how many times they happened.",
    "The imparfait sets the scene. Use it for ongoing situations, descriptions, feelings and habits, without any focus on when they ended.",
    "The two often share a sentence: the imparfait gives the background, and the passé composé gives the event that interrupts it.",
    "The plus-que-parfait steps further back. It describes something that had already happened before another moment in the past.",
    "A few verbs change meaning with the tense. Je savais means I knew, but j'ai su means I found out. Je devais means I was supposed to, but j'ai dû means I had to.",
  ],
  examples: [
    { fr: "Quand je suis arrivé, il pleuvait.", en: "When I arrived, it was raining." },
    {
      fr: "Tous les étés, nous allions chez mes grands-parents.",
      en: "Every summer we used to go to my grandparents' house.",
    },
    { fr: "Hier, j'ai travaillé jusqu'à vingt heures.", en: "Yesterday I worked until 8 p.m." },
    {
      fr: "Je ne savais pas qu'elle avait déjà démissionné.",
      en: "I didn't know she had already resigned.",
    },
    { fr: "Il a eu peur quand la lumière s'est éteinte.", en: "He got scared when the light went out." },
  ],
  sentences: [
    {
      id: "past-tenses-01",
      fr: "Je lisais mes mails quand le directeur est entré.",
      en: "I was reading my emails when the director came in.",
    },
    {
      id: "past-tenses-02",
      fr: "Quand j'étais petit, je passais mes vacances en Bretagne.",
      en: "When I was little, I used to spend my holidays in Brittany.",
    },
    {
      id: "past-tenses-03",
      fr: "Nous avons vécu dix ans à Lyon avant de déménager.",
      en: "We lived in Lyon for ten years before moving.",
    },
    {
      id: "past-tenses-04",
      fr: "Il faisait beau, alors nous avons mangé dehors.",
      en: "The weather was nice, so we ate outside.",
    },
    {
      id: "past-tenses-05",
      fr: "Elle n'est pas venue parce qu'elle était malade.",
      en: "She didn't come because she was ill.",
    },
    {
      id: "past-tenses-06",
      fr: "J'ai su la nouvelle ce matin.",
      en: "I found out the news this morning.",
    },
    {
      id: "past-tenses-07",
      fr: "Je pensais que tu avais déjà réservé les billets.",
      en: "I thought you had already booked the tickets.",
    },
    {
      id: "past-tenses-08",
      fr: "Quand nous sommes arrivés à la gare, le train était déjà parti.",
      en: "When we got to the station, the train had already left.",
    },
    {
      id: "past-tenses-09",
      fr: "Elle a dû partir plus tôt parce que son fils avait de la fièvre.",
      en: "She had to leave earlier because her son had a fever.",
    },
    {
      id: "past-tenses-10",
      fr: "Je devais l'appeler hier, mais j'ai complètement oublié.",
      en: "I was supposed to call him yesterday, but I completely forgot.",
    },
    {
      id: "past-tenses-11",
      fr: "Il m'a dit qu'il avait trouvé un nouveau poste.",
      en: "He told me he had found a new job.",
    },
    {
      id: "past-tenses-12",
      fr: "On discutait depuis une heure quand elle a enfin posé la question.",
      en: "We had been talking for an hour when she finally asked the question.",
    },
  ],
};
