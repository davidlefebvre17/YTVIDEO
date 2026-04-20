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
  pubDate: string;     // YYYY-MM-DD — publication / viewer day
  prevDate: string;    // YYYY-MM-DD — day before market day
  snapLabel: string;   // "mercredi 12 mars 2026"
  pubLabel: string;    // "jeudi 13 mars 2026"
  prevLabel: string;   // "mardi 11 mars 2026"
  snapDayName: string; // "mercredi"
  pubDayName: string;  // "jeudi"
  /** True when pub = Monday AND gap(snap→pub) >= 2 days (weekend elapsed) */
  isMondayRecap: boolean;
  /** Formatted block ready to inject into LLM prompts */
  block: string;
}

/**
 * Compute temporal anchors from a snapshot date (YYYY-MM-DD).
 * Publication date = snap + 1 by default (morning-recap assumption).
 * Pass `publishDate` explicitly for Monday recaps (pub = Monday, snap = previous Friday).
 */
export function buildTemporalAnchors(
  snapshotDate: string,
  publishDate?: string,
): TemporalAnchors {
  const [sy, sm, sd] = snapshotDate.split('-').map(Number);
  const snap = new Date(Date.UTC(sy, sm - 1, sd));

  let pub: Date;
  if (publishDate) {
    const [py, pm, pd] = publishDate.split('-').map(Number);
    pub = new Date(Date.UTC(py, pm - 1, pd));
  } else {
    pub = new Date(Date.UTC(sy, sm - 1, sd + 1));
  }
  const prev = new Date(Date.UTC(sy, sm - 1, sd - 1));

  const snapLabel  = formatDateFR(snap);
  const pubLabel   = formatDateFR(pub);
  const prevLabel  = formatDateFR(prev);
  const snapDayName = JOURS_FR[snap.getUTCDay()];
  const pubDayName  = JOURS_FR[pub.getUTCDay()];

  const pubDate  = pub.toISOString().slice(0, 10);
  const prevDate = prev.toISOString().slice(0, 10);

  const tomorrowDate = new Date(pub.getTime() + 86400000);
  const tomorrowLabel = formatDateFR(tomorrowDate);
  const tomorrowDayName = JOURS_FR[tomorrowDate.getUTCDay()];

  const gapDays = Math.round((pub.getTime() - snap.getTime()) / 86400000);
  const isMondayRecap = pubDayName === 'lundi' && gapDays >= 2;

  const standardBlock = `## ANCRES TEMPORELLES (vidéo publiée le MATIN du ${pubLabel})
Le spectateur regarde cette vidéo LE MATIN avant l'ouverture des marchés.
Séance couverte ("hier" pour le spectateur) : ${snapLabel}
Aujourd'hui pour le spectateur : ${pubLabel} (matin)
Demain pour le spectateur : ${tomorrowLabel}

RÈGLES DE RÉDACTION :
- La séance du ${snapLabel} = "hier" dans la narration (le spectateur regarde le MATIN du ${pubLabel})
- "aujourd'hui" = ${pubLabel} — pour les événements/publications prévus CE JOUR
- "demain" = ${tomorrowLabel} — uniquement pour ce qui vient après
- Jours de semaine obligatoires dans les 72h : "ce ${pubDayName}", "${tomorrowDayName}", etc.
- JAMAIS "ce soir" — le spectateur regarde le MATIN, pas le soir
- JAMAIS "aujourd'hui les marchés ont clôturé" — la séance est TERMINÉE depuis hier`;

  const mondayBlock = `## ANCRES TEMPORELLES — MODE LUNDI (RÉCAP DE SEMAINE)

🔶 ATTENTION : tu es LUNDI matin (${pubLabel}). Les marchés actions/forex sont FERMÉS depuis vendredi soir.

CONTEXTE CRITIQUE — À INTÉRIORISER AVANT D'ÉCRIRE :
- La dernière séance disponible = ${snapLabel} (clôture de la semaine passée).
- L'épisode de SAMEDI a déjà couvert cette séance en détail. Les prix que tu vois sont ACQUIS, pas nouveaux.
- NE JAMAIS présenter une variation comme "le move d'aujourd'hui" ou "le move d'hier". Elle date de vendredi.
- Reformule en : "en clôture de semaine", "vendredi dernier", "sur l'ensemble de la semaine passée".

CONTINUITÉ ABSOLUE AVEC L'ÉPISODE DE SAMEDI :
- Ne contredis JAMAIS les conclusions de samedi. Si samedi a conclu "le pétrole casse à la baisse",
  lundi tu PROLONGES : "ce constat tient, la question devient : est-ce que ça continue cette semaine ?"
- C'est le même marché, deux jours plus tard. Angle différent, pas verdict différent.

MISSION DU LUNDI (3 piliers, dans cet ordre de priorité) :
1. **Récap de la semaine passée** — l'arc narratif, les 2-3 mécanismes qui ont compté, les niveaux techniques balayés. Utilise le bloc RÉCAP TECHNIQUE HEBDO si présent.
2. **Actualités du weekend** — géopolitique, annonces politiques, résultats corporates publiés samedi/dimanche. C'est le VRAI neuf du lundi.
3. **Setup de la semaine qui commence** — calendrier macro (${pubLabel} à ${tomorrowLabel}+4), résultats d'entreprises attendus, enjeux à surveiller.

CRYPTO — seule exception aux marchés fermés :
Bitcoin et Ethereum ont bougé tout le weekend (marchés 24/7). Si mouvement notable depuis vendredi
(±3% ou plus), tu peux en parler dans UN segment — PAS le sujet principal. Pour tous les autres actifs,
les prix n'ont pas bougé depuis vendredi.

TEMPORALITÉ :
- "vendredi dernier" ou "vendredi" = ${snapLabel} (clôture couverte par samedi)
- "ce weekend" = samedi et dimanche (news, crypto moves, géopolitique)
- "aujourd'hui" = ${pubLabel} — ouverture de semaine
- "cette semaine" = les 5 jours à venir jusqu'à vendredi
- "la semaine dernière" = lundi à vendredi passés
- JAMAIS "ce soir" — le spectateur regarde le MATIN`;

  const block = isMondayRecap ? mondayBlock : standardBlock;

  return {
    snapDate: snapshotDate,
    pubDate,
    prevDate,
    snapLabel,
    pubLabel,
    prevLabel,
    snapDayName,
    pubDayName,
    isMondayRecap,
    block,
  };
}

/**
 * Convert any YYYY-MM-DD date into a human-readable temporal label
 * relative to the viewer (publication day = snapDate + 1).
 *
 * Examples (snapshot = 2026-03-20, pub = 2026-03-21):
 *   "2026-03-19" → "hier (mercredi 19 mars)"       — from viewer's POV: yesterday = snap day - 1
 *   "2026-03-20" → "hier (jeudi 20 mars)"           — snap day = "hier" for viewer
 *   "2026-03-21" → "aujourd'hui vendredi 21 mars"   — pub day
 *   "2026-03-22" → "demain samedi 22 mars"           — pub + 1
 *   "2026-03-25" → "lundi 25 mars"                   — beyond 48h: day name + date
 */
export function labelEventDate(eventDate: string, snapshotDate: string): string {
  const [sy, sm, sd] = snapshotDate.split('-').map(Number);
  const snap = new Date(Date.UTC(sy, sm - 1, sd));
  const pub  = new Date(Date.UTC(sy, sm - 1, sd + 1));

  const [ey, em, ed] = eventDate.split('-').map(Number);
  const ev = new Date(Date.UTC(ey, em - 1, ed));

  const diffFromPub = Math.round((ev.getTime() - pub.getTime()) / 86400000);
  const dayName = JOURS_FR[ev.getUTCDay()];
  const shortLabel = `${dayName} ${ev.getUTCDate()} ${MOIS_FR[ev.getUTCMonth()]}`;

  if (diffFromPub === -2) return `avant-hier (${shortLabel})`;
  if (diffFromPub === -1) return `hier (${shortLabel})`;
  if (diffFromPub === 0) return `aujourd'hui ${shortLabel}`;
  if (diffFromPub === 1) return `demain ${shortLabel}`;
  return shortLabel;
}
