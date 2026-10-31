import type { GrammarConcept } from "./types";

export const conditional: GrammarConcept = {
  id: "conditional",
  title: "The conditional and si clauses",
  summary: "Being polite, giving advice, voicing regret, and matching tenses after si.",
  explanation: [
    "The present conditional joins the future stem to the imparfait endings (-ais, -ais, -ait, -ions, -iez, -aient): je voudrais, tu pourrais, il faudrait.",
    "Use it for polite requests, wishes and advice (tu devrais), and for information that isn't confirmed, as in news reports.",
    "The past conditional is the conditional of avoir or être plus a past participle. It expresses regrets and reproaches: j'aurais dû, tu aurais pu.",
    "Si clauses follow three patterns. Si with the present leads to the present, the future or a command. Si with the imparfait leads to the present conditional. Si with the plus-que-parfait leads to the past conditional.",
    "The patterns can mix when a past condition has a present result: Si j'avais pris le train, je serais déjà là.",
    "When si means if, it is never followed by the conditional: say si j'avais, not si j'aurais. When it means whether, the conditional is fine: je me demande s'il accepterait.",
  ],
  examples: [
    { fr: "Je voudrais un café, s'il vous plaît.", en: "I'd like a coffee, please." },
    { fr: "Tu devrais en parler à ton responsable.", en: "You should talk to your manager about it." },
    { fr: "Si tu finis tôt, appelle-moi.", en: "If you finish early, call me." },
    {
      fr: "Si j'avais plus de temps, je voyagerais davantage.",
      en: "If I had more time, I'd travel more.",
    },
    { fr: "Si tu m'avais prévenu, je serais venu.", en: "If you had warned me, I would have come." },
    {
      fr: "Selon la presse, le ministre aurait démissionné.",
      en: "According to the press, the minister has reportedly resigned.",
    },
  ],
  sentences: [
    {
      id: "conditional-01",
      fr: "Pourriez-vous m'envoyer le document avant midi ?",
      en: "Could you send me the document before noon?",
    },
    {
      id: "conditional-02",
      fr: "À ta place, je n'accepterais pas cette offre.",
      en: "In your position, I wouldn't accept this offer.",
    },
    {
      id: "conditional-03",
      fr: "S'il fait beau demain, nous irons à la plage.",
      en: "If the weather is nice tomorrow, we'll go to the beach.",
    },
    {
      id: "conditional-04",
      fr: "Si j'étais toi, je lui dirais la vérité.",
      en: "If I were you, I'd tell him the truth.",
    },
    {
      id: "conditional-05",
      fr: "Si nous avions su, nous serions partis plus tôt.",
      en: "If we had known, we would have left earlier.",
    },
    {
      id: "conditional-06",
      fr: "J'aurais dû t'appeler avant de venir.",
      en: "I should have called you before coming.",
    },
    { id: "conditional-07", fr: "Tu aurais pu me le dire !", en: "You could have told me!" },
    {
      id: "conditional-08",
      fr: "Si elle avait pris le train de huit heures, elle serait déjà là.",
      en: "If she had taken the eight o'clock train, she would already be here.",
    },
    {
      id: "conditional-09",
      fr: "Il a dit qu'il nous rappellerait la semaine suivante.",
      en: "He said he would call us back the following week.",
    },
    {
      id: "conditional-10",
      fr: "Au cas où tu arriverais en retard, préviens-moi.",
      en: "In case you arrive late, let me know.",
    },
    {
      id: "conditional-11",
      fr: "Il y aurait une vingtaine de blessés, selon les premières informations.",
      en: "According to initial reports, around twenty people are said to be injured.",
    },
    {
      id: "conditional-12",
      fr: "Je me demande si elle accepterait de nous aider.",
      en: "I wonder whether she would agree to help us.",
    },
  ],
};
