const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDateFR(d: Date): string {
  return `${JOURS_FR[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export interface TemporalAnchors {
  snapDate: string;    // YYYY-MM-DD — market day covered
  pubDate: string;     // YYYY-MM-DD — publication / viewer day (snap + 1)
  prevDate: string;    // YYYY-MM-DD — day before market day
  snapLabel: string;   // "mercredi 12 mars 2026"
  pubLabel: string;    // "jeudi 13 mars 2026"
  prevLabel: string;   // "mardi 11 mars 2026"
  snapDayName: string; // "mercredi"
  pubDayName: string;  // "jeudi"
  /** Formatted block ready to inject into LLM prompts */
  block: string;
}

/**
 * Compute temporal anchors from a snapshot date (YYYY-MM-DD).
 * Publication date = snap + 1 calendar day (morning-recap assumption).
 */
export function buildTemporalAnchors(snapshotDate: string): TemporalAnchors {
  const [sy, sm, sd] = snapshotDate.split('-').map(Number);
  const snap = new Date(Date.UTC(sy, sm - 1, sd));
  const pub  = new Date(Date.UTC(sy, sm - 1, sd + 1));
  const prev = new Date(Date.UTC(sy, sm - 1, sd - 1));

  const snapLabel  = formatDateFR(snap);
  const pubLabel   = formatDateFR(pub);
  const prevLabel  = formatDateFR(prev);
  const snapDayName = JOURS_FR[snap.getUTCDay()];
  const pubDayName  = JOURS_FR[pub.getUTCDay()];

  const pubDate  = pub.toISOString().slice(0, 10);
  const prevDate = prev.toISOString().slice(0, 10);

  const tomorrowDate = new Date(Date.UTC(sy, sm - 1, sd + 2));
  const tomorrowLabel = formatDateFR(tomorrowDate);
  const tomorrowDayName = JOURS_FR[tomorrowDate.getUTCDay()];

  const block = `## ANCRES TEMPORELLES (perspective spectateur — vidéo publiée le ${pubLabel})
Séance couverte ("hier" pour le spectateur) : ${snapLabel}
Aujourd'hui pour le spectateur : ${pubLabel}
Demain pour le spectateur : ${tomorrowLabel}

RÈGLES DE RÉDACTION :
- La séance du ${snapLabel} = "hier" dans la narration (le spectateur regarde le ${pubLabel})
- "aujourd'hui" = ${pubLabel} — pour les événements/publications prévus CE JOUR (ex: "aujourd'hui à 14h30 le PCE")
- "demain" = ${tomorrowLabel} — uniquement pour ce qui vient après
- Jours de semaine obligatoires dans les 72h : "ce ${pubDayName}", "${tomorrowDayName}", etc. — évite "dans 2 jours"
- JAMAIS écrire "aujourd'hui les marchés ont clôturé" — la séance est TERMINÉE depuis hier`;

  return { snapDate: snapshotDate, pubDate, prevDate, snapLabel, pubLabel, prevLabel, snapDayName, pubDayName, block };
}
