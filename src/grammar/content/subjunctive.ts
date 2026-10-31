import type { GrammarConcept } from "./types";

export const subjunctive: GrammarConcept = {
  id: "subjunctive",
  title: "The subjunctive",
  summary: "When que calls for the subjunctive, and when it doesn't.",
  explanation: [
    "The subjunctive follows expressions of need, wishes, emotion, doubt and possibility when the second clause has its own subject: Je veux que tu viennes. With a single subject, use the infinitive: Je veux venir.",
    "To form it, take the ils form of the present, drop -ent, and add -e, -es, -e, -ions, -iez, -ent. Learn the common irregulars: que je sois, que j'aie, que j'aille, que je fasse, que je puisse, que je sache, que je veuille.",
    "Common triggers are il faut que, vouloir que, être content que, avoir peur que, douter que, il est possible que, bien que, pour que, avant que, à moins que, jusqu'à ce que and sans que.",
    "Certainty keeps the indicative: je pense que, je crois que, il est certain que, j'espère que, parce que, pendant que, après que.",
    "Penser and croire usually switch to the subjunctive in the negative, because the speaker no longer vouches for the fact: Je ne pense pas qu'il soit là.",
    "The past subjunctive is the subjunctive of avoir or être plus a past participle. It shows that something happened before the main verb: Je suis content que tu sois venu.",
  ],
  examples: [
    { fr: "Il faut que tu saches la vérité.", en: "You need to know the truth." },
    { fr: "Je suis ravie que vous puissiez venir.", en: "I'm delighted that you can come." },
    {
      fr: "Bien qu'il soit fatigué, il continue à travailler.",
      en: "Although he's tired, he keeps working.",
    },
    { fr: "Je pense qu'elle a raison.", en: "I think she's right." },
    { fr: "Je ne pense pas qu'elle ait raison.", en: "I don't think she's right." },
    { fr: "Je suis content que tu sois venu.", en: "I'm glad you came." },
  ],
  sentences: [
    {
      id: "subjunctive-01",
      fr: "Il faut que je parte avant dix-huit heures.",
      en: "I have to leave before 6 p.m.",
    },
    { id: "subjunctive-02", fr: "Je veux que tu fasses attention.", en: "I want you to be careful." },
    { id: "subjunctive-03", fr: "J'ai peur qu'il soit trop tard.", en: "I'm afraid it's too late." },
    {
      id: "subjunctive-04",
      fr: "Bien que ce soit difficile, nous n'allons pas abandonner.",
      en: "Although it's difficult, we're not going to give up.",
    },
    {
      id: "subjunctive-05",
      fr: "Je t'explique ça pour que tu comprennes la situation.",
      en: "I'm explaining this so that you understand the situation.",
    },
    {
      id: "subjunctive-06",
      fr: "Je doute qu'il puisse finir à temps.",
      en: "I doubt he can finish on time.",
    },
    {
      id: "subjunctive-07",
      fr: "Attends ici jusqu'à ce que je revienne.",
      en: "Wait here until I come back.",
    },
    {
      id: "subjunctive-08",
      fr: "Je ne crois pas qu'ils aient reçu le message.",
      en: "I don't believe they received the message.",
    },
    {
      id: "subjunctive-09",
      fr: "Il est possible que la réunion soit annulée.",
      en: "It's possible the meeting will be cancelled.",
    },
    {
      id: "subjunctive-10",
      fr: "Je viendrai à moins que tu ne préfères y aller seul.",
      en: "I'll come unless you'd rather go alone.",
    },
    {
      id: "subjunctive-11",
      fr: "C'est le meilleur film que j'aie jamais vu.",
      en: "It's the best film I've ever seen.",
    },
    {
      id: "subjunctive-12",
      fr: "Je suis désolé que vous ayez attendu si longtemps.",
      en: "I'm sorry you waited so long.",
    },
  ],
};
