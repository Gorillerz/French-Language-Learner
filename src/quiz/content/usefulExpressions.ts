import type { CuratedTopic } from "./types";

export const usefulExpressionsQuestions: CuratedTopic = {
  topicId: "useful-expressions",
  kind: "vocabulary",
  questions: [
    { slug: "01", format: "to-english", prompt: "Il m'a posé un lapin hier soir.", answer: "He stood me up last night.", distractors: ["He gave me a rabbit last night.", "He asked me a question last night.", "He played a trick on me last night."] },
    { slug: "02", format: "complete", prompt: "Ce n'est pas un accident : il l'a fait ___.", answer: "exprès", distractors: ["à la rigueur", "à peu près", "du coup"] },
    { slug: "03", format: "to-english", prompt: "Ça vaut le coup d'essayer.", answer: "It's worth trying.", distractors: ["It's too late to try.", "It hurts to try.", "It's pointless to try."] },
    { slug: "04", format: "complete", prompt: "Cette montre a coûté les ___ de la tête.", answer: "yeux", distractors: ["pieds", "cheveux", "oreilles"] },
    { slug: "05", format: "to-english", prompt: "J'en ai marre de ce bruit.", answer: "I'm fed up with this noise.", distractors: ["I love this noise.", "I can't hear this noise.", "I'm used to this noise."] },
    { slug: "06", format: "complete", prompt: "Il faisait si chaud qu'elle a failli tomber dans les ___.", answer: "pommes", distractors: ["poires", "prunes", "oranges"] },
    { slug: "07", format: "to-french", prompt: "Keep me informed.", answer: "Tiens-moi au courant.", distractors: ["Donne-moi un coup de main.", "Mets-moi au point.", "Laisse-moi tomber."] },
    { slug: "08", format: "complete", prompt: "La réunion aura ___ jeudi à dix heures.", answer: "lieu", distractors: ["place", "suite", "point"] },
    { slug: "09", format: "to-english", prompt: "Tu pourrais me donner un coup de main ?", answer: "Could you give me a hand?", distractors: ["Could you shake my hand?", "Could you hand me that?", "Could you call me later?"] },
    { slug: "10", format: "complete", prompt: "Tu ne peux pas venir ? Tant ___, on ira sans toi.", answer: "pis", distractors: ["mieux", "plus", "bien"] },
    { slug: "11", format: "to-english", prompt: "Prends un parapluie au cas où.", answer: "Take an umbrella just in case.", distractors: ["Take an umbrella wherever you go.", "Take an umbrella, it's raining.", "Put the umbrella back where it was."] },
    { slug: "12", format: "complete", prompt: "Il a ___ essayer, il n'y arrive jamais.", answer: "beau", distractors: ["bon", "bien", "lieu"] },
    { slug: "13", format: "to-english", prompt: "Je me suis rendu compte de mon erreur.", answer: "I realised my mistake.", distractors: ["I paid for my mistake.", "I reported my mistake.", "I repeated my mistake."] },
    { slug: "14", format: "complete", prompt: "Elle ne parle pas beaucoup ; ___, elle écoute très bien.", answer: "en revanche", distractors: ["à peu près", "au cas où", "tant mieux"] },
    { slug: "15", format: "to-english", prompt: "Il fait semblant de dormir.", answer: "He's pretending to sleep.", distractors: ["He seems to be asleep.", "He's trying to sleep.", "He's about to fall asleep."] },
    { slug: "16", format: "to-french", prompt: "It doesn't ring a bell.", answer: "Ça ne me dit rien.", distractors: ["Ça m'est égal.", "Ça ne marche pas.", "Ça ne sonne pas."] },
    { slug: "17", format: "complete", prompt: "Laisse ___, ça n'en vaut pas la peine.", answer: "tomber", distractors: ["tenir", "mettre", "rendre"] },
    { slug: "18", format: "to-english", prompt: "Il s'agit d'une erreur de calcul.", answer: "It's a calculation error.", distractors: ["He's dealing with a calculation error.", "He made a calculation error.", "It isn't a calculation error."] },
    { slug: "19", format: "complete", prompt: "On apprend ___ qu'on avance dans le projet.", answer: "au fur et à mesure", distractors: ["à peu près", "à la rigueur", "de toute façon"] },
    { slug: "20", format: "to-french", prompt: "We need to take stock of the project.", answer: "Il faut faire le point sur le projet.", distractors: ["Il faut mettre au point le projet.", "Il faut prendre du recul sur le projet.", "Il faut mettre le projet à jour."] },
  ],
};
