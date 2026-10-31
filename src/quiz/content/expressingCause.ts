import type { CuratedTopic } from "./types";

export const expressingCauseQuestions: CuratedTopic = {
  topicId: "expressing-cause",
  kind: "grammar",
  questions: [
    { slug: "01", format: "complete", prompt: "Je suis en retard ___ la grève.", answer: "à cause de", distractors: ["grâce à", "parce que", "car"] },
    { slug: "02", format: "complete", prompt: "J'ai réussi ___ ton aide.", answer: "grâce à", distractors: ["à cause de", "parce que", "puisque"] },
    { slug: "03", format: "complete", prompt: "___ il pleuvait, nous sommes restés à la maison.", answer: "Comme", distractors: ["Car", "Grâce à", "À cause de"] },
    { slug: "04", format: "complete", prompt: "Pourquoi tu pleures ? ___ j'ai perdu mon chat.", answer: "Parce que", distractors: ["Puisque", "Comme", "À cause de"] },
    { slug: "05", format: "complete", prompt: "Le vol est annulé ___ mauvais temps.", answer: "en raison du", distractors: ["grâce au", "puisque le", "car le"] },
    { slug: "06", format: "complete", prompt: "___ de temps, je n'ai pas fini.", answer: "Faute", distractors: ["Grâce", "Raison", "Force"] },
    { slug: "07", format: "complete", prompt: "À ___ de répéter, il a fini par comprendre.", answer: "force", distractors: ["cause", "raison", "faute"] },
    { slug: "08", format: "to-english", prompt: "Puisque tu es là, aide-moi.", answer: "Since you're here, help me.", distractors: ["Although you're here, help me.", "If you're here, help me.", "Help me before you leave."] },
    { slug: "09", format: "to-english", prompt: "Il n'est pas venu sous prétexte qu'il était malade.", answer: "He didn't come, claiming he was ill.", distractors: ["He didn't come because he really was ill.", "He came even though he was ill.", "He didn't come, so he fell ill."] },
    { slug: "10", format: "to-french", prompt: "Because of the rain, we stayed inside.", answer: "À cause de la pluie, nous sommes restés à l'intérieur.", distractors: ["Parce que la pluie, nous sommes restés à l'intérieur.", "Grâce à la pluie, nous sommes restés à l'intérieur.", "Car la pluie, nous sommes restés à l'intérieur."] },
    { slug: "11", format: "complete", prompt: "Il ne viendra pas, ___ qu'il est malade.", answer: "vu", distractors: ["car", "grâce", "puisque"] },
    { slug: "12", format: "complete", prompt: "Il a été licencié ___ avoir menti.", answer: "pour", distractors: ["de", "à cause de", "parce que"] },
    { slug: "13", format: "to-english", prompt: "Elle a été félicitée pour avoir sauvé son collègue.", answer: "She was congratulated for having saved her colleague.", distractors: ["She was congratulated by the colleague she saved.", "She was congratulated in order to save her colleague.", "She congratulated her colleague for saving her."] },
    { slug: "14", format: "to-english", prompt: "Faute d'argent, ils ont renoncé au voyage.", answer: "For lack of money, they gave up on the trip.", distractors: ["Thanks to the money, they went on the trip.", "Because of a money mistake, they cancelled the trip.", "Despite the money, they gave up on the trip."] },
    { slug: "15", format: "to-french", prompt: "Thanks to you, I passed the exam.", answer: "Grâce à toi, j'ai réussi l'examen.", distractors: ["À cause de toi, j'ai réussi l'examen.", "Parce que toi, j'ai réussi l'examen.", "Comme toi, j'ai réussi l'examen."] },
    { slug: "16", format: "complete", prompt: "Il est fatigué ___ il a mal dormi.", answer: "parce qu'", distractors: ["à cause d'", "grâce à", "en raison d'"] },
    { slug: "17", format: "complete", prompt: "Il a perdu sa voix ___ crier.", answer: "à force de", distractors: ["à cause de", "grâce à", "parce que"] },
    { slug: "18", format: "to-english", prompt: "Comme il était tard, nous sommes partis.", answer: "As it was late, we left.", distractors: ["Although it was late, we left.", "We left late, as usual.", "If it had been late, we would have left."] },
    { slug: "19", format: "complete", prompt: "Le magasin est fermé ___ travaux.", answer: "en raison de", distractors: ["parce que", "puisque", "comme"] },
    { slug: "20", format: "to-english", prompt: "Vu que tu insistes, je viendrai.", answer: "Seeing as you insist, I'll come.", distractors: ["Even though you insist, I won't come.", "I saw you insist, so I came.", "If you insist, I might come."] },
  ],
};
