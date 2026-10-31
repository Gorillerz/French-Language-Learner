import type { GrammarConcept } from "./types";

export const expressingCause: GrammarConcept = {
  id: "expressing-cause",
  title: "Expressing cause",
  summary: "Giving reasons with parce que, puisque, comme, à cause de, grâce à and more.",
  explanation: [
    "Parce que is the neutral choice and answers the question pourquoi. Car gives a similar reason, but mostly in writing, and it follows the main clause: Je rentre, car il est tard.",
    "Puisque gives a reason the listener already knows or can't dispute. Comme puts the cause first, at the start of the sentence.",
    "Parce que, puisque and comme take a clause. Before a noun, use à cause de for a neutral or bad result, and grâce à for a good one: à cause de la pluie, but parce qu'il pleut.",
    "En raison de is the formal version you see in announcements. Faute de means for lack of. À force de means through repeated effort or by constantly doing something.",
    "Étant donné que and vu que present a fact as the basis for what follows. Sous prétexte que signals a reason the speaker doesn't quite believe.",
    "Pour with a past infinitive gives the reason for a punishment or reward: Il a été félicité pour avoir sauvé son collègue.",
  ],
  examples: [
    { fr: "Je reste à la maison parce que je suis malade.", en: "I'm staying home because I'm ill." },
    { fr: "Puisque tu es là, aide-moi.", en: "Since you're here, give me a hand." },
    {
      fr: "Comme il pleuvait, nous sommes restés à l'intérieur.",
      en: "As it was raining, we stayed inside.",
    },
    {
      fr: "Le vol a été annulé à cause de la neige.",
      en: "The flight was cancelled because of the snow.",
    },
    { fr: "Grâce à ton aide, j'ai terminé à temps.", en: "Thanks to your help, I finished on time." },
    {
      fr: "Faute de temps, nous n'avons pas pu aborder ce point.",
      en: "For lack of time, we weren't able to address this point.",
    },
  ],
  sentences: [
    {
      id: "expressing-cause-01",
      fr: "Je ne suis pas sorti parce qu'il faisait trop froid.",
      en: "I didn't go out because it was too cold.",
    },
    {
      id: "expressing-cause-02",
      fr: "Comme je n'avais pas ton numéro, je n'ai pas pu t'appeler.",
      en: "As I didn't have your number, I couldn't call you.",
    },
    {
      id: "expressing-cause-03",
      fr: "Puisque tu connais déjà le dossier, présente-le à ma place.",
      en: "Since you already know the file, present it for me.",
    },
    {
      id: "expressing-cause-04",
      fr: "Nous sommes arrivés en retard à cause des embouteillages.",
      en: "We arrived late because of the traffic jams.",
    },
    {
      id: "expressing-cause-05",
      fr: "Grâce à ses conseils, j'ai obtenu le poste.",
      en: "Thanks to her advice, I got the job.",
    },
    {
      id: "expressing-cause-06",
      fr: "Le train est supprimé en raison d'un mouvement de grève.",
      en: "The train is cancelled due to strike action.",
    },
    {
      id: "expressing-cause-07",
      fr: "Faute d'argent, ils ont dû renoncer à leur projet.",
      en: "For lack of money, they had to give up their plan.",
    },
    {
      id: "expressing-cause-08",
      fr: "À force de s'entraîner, il a fini par gagner.",
      en: "Through constant practice, he eventually won.",
    },
    {
      id: "expressing-cause-09",
      fr: "Il a été licencié pour avoir menti à son employeur.",
      en: "He was dismissed for lying to his employer.",
    },
    {
      id: "expressing-cause-10",
      fr: "Étant donné que le budget a été réduit, nous devons revoir nos priorités.",
      en: "Given that the budget has been cut, we must review our priorities.",
    },
    {
      id: "expressing-cause-11",
      fr: "Vu qu'il est déjà tard, on devrait y aller.",
      en: "Seeing as it's already late, we should get going.",
    },
    {
      id: "expressing-cause-12",
      fr: "Elle a refusé sous prétexte qu'elle était trop occupée.",
      en: "She refused on the pretext that she was too busy.",
    },
  ],
};
