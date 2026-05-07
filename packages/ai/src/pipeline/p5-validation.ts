import { generateStructuredJSON } from "../llm-client";
import { ValidationResponseSchema, zodValidator } from "./schemas";
import type {
  DraftScript, EditorialPlan, AnalysisBundle, WordBudget,
  SnapshotFlagged, ValidationResult, ValidationIssue,
  FlaggedAsset,
} from "./types";
import { loadMemory } from "@yt-maker/data";
import { buildTemporalAnchors } from "./helpers/temporal-anchors";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// ── Known bad patterns ──────────────────────────────────

const DISCLAIMER_PATTERNS = [
  /ceci ne constitue pas un conseil/i,
  /ne constitue en aucun cas/i,
  /à titre informatif uniquement/i,
  /faites vos propres recherches/i,
  /DYOR/i,
  /pas un conseil (?:en investissement|financier)/i,
  /rappel[,\s]+ce contenu est purement éducatif[^.]*/i,
  /ce contenu est purement éducatif et ne constitue pas[^.]*/i,
];

// Anglicism fixes removed — the new paradigm is zero anglicisms (axe 2).
// Opus writes in French, P5 must NOT reintroduce English terms.

// ── Blacklists & whitelists (enforce C3 rules deterministically) ──

/**
 * Anglicismes évidents — filet rapide. Haiku fait la 2e passe pour les plus subtils.
 * Le prompt C3 dit "ZÉRO anglicisme" sans liste exhaustive.
 */
const ANGLICISMES_BLACKLIST: RegExp[] = [
  /\bspread\b/i, /\bspreads\b/i,
  /\bpricing\b/i, /\bpricer\b/i, /\bpricé\b/i, /\bprice\b/i,
  /\brisk-?on\b/i, /\brisk-?off\b/i,
  /\bhedge\b/i, /\bhedging\b/i, /\bhedger\b/i,
  /\btrader\b/i, /\btrading\b/i,
  /\bshort\s+squeeze\b/i,
  /\bearnings\b/i, /\bguidance\b/i,
  /\bupside\b/i, /\bdownside\b/i,
  /\bpullback\b/i, /\brebound\b/i,
  /\bbenchmark\b/i,
  /\bmarket\s+cap\b/i,
  /\bsell-?off\b/i,
  /\bbreakout\b/i, /\bbreakdown\b/i,
  /\bdrawdown\b/i,
  /\bleverage\b/i,
  /\bbull\s+run\b/i, /\bbullish\b/i, /\bbearish\b/i,
  /\brally\b/i,
  /\bbuyback\b/i,
  /\bmomentum\b/i,
  // Added from audit: common finance anglicisms Opus slips
  /\bmove\b/i, /\bmoves\b/i,
  /\bspot\b/i,
  /\bswap\b/i, /\bswaps\b/i,
  /\bgap\b/i, /\bgaps\b/i,
  /\bspike\b/i, /\bspikes\b/i,
  /\bcrash\b/i,
  /\bdip\b/i, /\bdips\b/i,
  /\btight\b/i, /\bflat\b/i,
];

/**
 * Sigles techniques autorisés explicitement par le prompt C3 (whitelist).
 * TOUT autre mot en MAJUSCULES 2-6 lettres sera flaggé comme blocker.
 */
const SIGLES_WHITELIST = new Set([
  // Proper nouns explicitly allowed in C3 prompt (banques centrales exclues — noms complets)
  'S&P', 'NASDAQ', 'NYSE',
  // Article / lang markers common in French
  'A', 'AU', 'AUX', 'LE', 'LA', 'LES', 'UN', 'UNE', 'DES',
  'ET', 'OU', 'OÙ', 'NI', 'MAIS', 'SI',
  'DE', 'DU', 'PAR', 'POUR', 'SUR', 'SOUS', 'DANS', 'AVEC', 'SANS', 'CHEZ',
  // Common acronyms integrated into French (not technical jargon)
  'PIB', 'TVA', 'UE', 'OTAN', 'ONU', 'OPEP', 'PME', 'PDG', 'RH',
  'USA', 'UK', 'EU',
  // Roman numerals often in proper nouns
  'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
]);

/**
 * Langage écrit formel à bannir — le prompt C3 cite ces patterns comme exemples d'anti-oral.
 */
const LANGAGE_FORMEL_PATTERNS: RegExp[] = [
  /\bil convient de\b/i,
  /\bforce est de\b/i,
  /\bnonobstant\b/i,
  /\beu égard\b/i,
  /\bil sied\b/i,
  /\bil importe de\b/i,
];

/**
 * Recommandations directes interdites (AMF/MiFID II).
 */
const RECO_DIRECTE_PATTERNS: RegExp[] = [
  /\bachetez\b/i, /\bvendez\b/i,
  /\bil faut acheter\b/i, /\bil faut vendre\b/i,
  /\b(c'est|voici|voilà) le bon moment (pour|d')\b/i,
  /\bje recommande\b/i,
  /\bon devrait (acheter|vendre|miser)\b/i,
  /\bil faudrait (acheter|vendre|prendre position)\b/i,
];

/**
 * Termes retail/clickbait interdits par le prompt C3.
 */
const TON_RETAIL_PATTERNS: RegExp[] = [
  /\bto the moon\b/i,
  /\bpépite\b/i,
  /\bt'as vu\b/i,
  /\bc'est dingue\b/i,
];

// ── Company names loader (cache) ────────────────────────

let _companyNames: Array<{ name: string; symbol: string }> | null = null;

function loadCompanyNames(): Array<{ name: string; symbol: string }> {
  if (_companyNames) return _companyNames;
  _companyNames = [];
  const filePath = join(process.cwd(), 'data', 'company-profiles.json');
  if (!existsSync(filePath)) return _companyNames;
  try {
    const profiles: Array<{ symbol: string; name: string }> = JSON.parse(readFileSync(filePath, 'utf-8'));
    // Only keep companies with a real proper name (skip indices like "Dow Jones" which are allowed)
    const ALLOWED_PROPER_NOUNS = new Set(['Dow Jones', 'Nasdaq', 'CAC 40', 'Bitcoin', 'Ethereum']);
    for (const p of profiles) {
      if (!p.name || p.name.length < 3) continue;
      if (ALLOWED_PROPER_NOUNS.has(p.name)) continue;
      _companyNames.push({ name: p.name, symbol: p.symbol });
    }
  } catch {}
  return _companyNames;
}

// ── Mechanical validation (code) ────────────────────────

function getAllNarration(draft: DraftScript): string {
  const parts = [
    draft.owlIntro ?? '',
    draft.coldOpen?.narration ?? '',
    draft.thread?.narration ?? '',
    ...draft.segments.map(s => s.narration),
    ...draft.segments.map(s => s.owlTransition ?? ''),
    draft.owlClosing ?? '',
    draft.closing?.narration ?? '',
  ];
  return parts.join(' ');
}

/**
 * Build a whitelist of known numeric values from all data sources.
 * Any number > 10 in the narration not in this set is potentially hallucinated.
 */
function buildKnownNumbers(flagged?: SnapshotFlagged): Set<number> {
  const known = new Set<number>();
  if (!flagged) return known;

  for (const a of flagged.assets) {
    // Snapshot prices
    known.add(Math.round(a.price * 100) / 100);
    if (a.snapshot.high24h) known.add(Math.round(a.snapshot.high24h * 100) / 100);
    if (a.snapshot.low24h) known.add(Math.round(a.snapshot.low24h * 100) / 100);
    // changePct (rounded to 1 or 2 decimals)
    known.add(Math.round(Math.abs(a.changePct) * 10) / 10);
    known.add(Math.round(Math.abs(a.changePct) * 100) / 100);
    // Technicals
    const t = a.snapshot.technicals;
    if (t) {
      if (t.rsi14) known.add(Math.round(t.rsi14));
      for (const s of t.supports ?? []) known.add(Math.round(s * 100) / 100);
      for (const r of t.resistances ?? []) known.add(Math.round(r * 100) / 100);
    }
    // MultiTF
    const m = a.snapshot.multiTF;
    if (m) {
      if (m.daily3y?.sma200) known.add(Math.round(m.daily3y.sma200));
      if (m.daily1y?.high52w) known.add(Math.round(m.daily1y.high52w * 100) / 100);
      if (m.daily1y?.low52w) known.add(Math.round(m.daily1y.low52w * 100) / 100);
    }
    // MarketMemory zones
    try {
      const mem = loadMemory(a.symbol);
      if (mem) {
        for (const z of mem.zones) known.add(Math.round(z.level * 100) / 100);
        if (mem.indicators_daily) {
          known.add(Math.round(mem.indicators_daily.rsi14));
          known.add(Math.round(Math.abs(mem.indicators_daily.mm20_slope_deg)));
        }
      }
    } catch {}
  }
  // Yields
  if (flagged.yields) {
    known.add(flagged.yields.us10y);
    known.add(flagged.yields.us2y);
    known.add(Math.round(flagged.yields.spread10y2y * 100)); // as bps
    known.add(Math.round(Math.abs(flagged.yields.spread10y2y) * 100) / 100);
  }
  // Sentiment
  if (flagged.sentiment?.cryptoFearGreed) {
    known.add(flagged.sentiment.cryptoFearGreed.value);
  }
  // StockScreen top movers
  for (const s of flagged.screenResults ?? []) {
    if (s.changePct) {
      known.add(Math.round(Math.abs(s.changePct) * 10) / 10);
      known.add(Math.round(Math.abs(s.changePct) * 100) / 100);
    }
  }
  return known;
}

/**
 * Extract all "significant" numbers from text (> 10, likely price levels or indicators).
 * Ignores percentages, durations, and small numbers.
 */
function extractSignificantNumbers(text: string): number[] {
  const nums: number[] = [];
  // Match numbers like 6744, 99.85, 4994, but skip percentages and small
  const matches = text.matchAll(/(?<!\w)(\d[\d\s]*[\d,.]*\d)(?!\s*(?:pour cent|%|s\b|min\b|sec))/g);
  for (const m of matches) {
    const raw = m[1].replace(/[\s,]/g, '').replace(',', '.');
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 10) nums.push(n);
  }
  return nums;
}

export function validateMechanical(
  draft: DraftScript,
  plan: EditorialPlan,
  budget: WordBudget,
  flagged?: SnapshotFlagged,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fullText = getAllNarration(draft);

  // 1. Duration range (target 8-10 min = 480-600s, tolerance 7-12 min = 420-720s)
  const duration = draft.metadata?.totalDurationSec ?? 0;
  if (duration < 480 || duration > 720) {
    issues.push({
      type: 'length',
      description: `Durée estimée ${duration}s hors cible 480-720s (8-12 min)`,
      severity: duration < 360 || duration > 840 ? 'blocker' : 'warning',
      source: 'code',
    });
  }

  // 2. Word budget per segment (±15% tolerance for warning, ±30% for blocker)
  for (const seg of draft.segments) {
    const budgetSeg = budget.segments.find(b => b.segmentId === seg.segmentId);
    if (budgetSeg) {
      if (seg.wordCount > budgetSeg.maxWords * 1.3) {
        issues.push({
          type: 'length',
          segmentId: seg.segmentId,
          description: `${seg.wordCount} mots >> max ${budgetSeg.maxWords} (+30%)`,
          severity: 'blocker',
          suggestedFix: `Réduire à ~${budgetSeg.targetWords} mots`,
          source: 'code',
        });
      } else if (seg.wordCount > budgetSeg.maxWords * 1.15) {
        issues.push({
          type: 'length',
          segmentId: seg.segmentId,
          description: `${seg.wordCount} mots > max ${budgetSeg.maxWords} (+15%)`,
          severity: 'warning',
          suggestedFix: `Réduire à ~${budgetSeg.targetWords} mots`,
          source: 'code',
        });
      }
    }
  }

  // 3. "drama score" never in narration
  if (/drama\s*score/i.test(fullText)) {
    issues.push({
      type: 'compliance',
      description: '"drama score" mentionné dans la narration (donnée interne)',
      severity: 'blocker',
      source: 'code',
    });
  }

  // 4. Disclaimer in narration
  for (const pattern of DISCLAIMER_PATTERNS) {
    if (pattern.test(fullText)) {
      issues.push({
        type: 'compliance',
        description: `Disclaimer détecté dans narration : ${pattern.source.slice(0, 50)}`,
        severity: 'blocker',
        suggestedFix: 'Supprimer — le disclaimer est un bandeau visuel, pas oral',
        source: 'code',
      });
    }
  }

  // 5. Segment order matches editorial plan
  const planOrder = plan.segments.map(s => s.id);
  const draftOrder = draft.segments.map(s => s.segmentId);
  if (JSON.stringify(planOrder) !== JSON.stringify(draftOrder)) {
    issues.push({
      type: 'structure',
      description: `Ordre segments incorrect. Attendu: [${planOrder.join(',')}] Got: [${draftOrder.join(',')}]`,
      severity: 'blocker',
      source: 'code',
    });
  }

  // 6. Segment count
  if (draft.segments.length !== plan.segments.length) {
    issues.push({
      type: 'structure',
      description: `${draft.segments.length} segments vs ${plan.segments.length} planifiés`,
      severity: 'blocker',
      source: 'code',
    });
  }

  // 7. Cold open too long (word count)
  if (draft.coldOpen && draft.coldOpen.wordCount > 20) {
    issues.push({
      type: 'length',
      segmentId: 'coldOpen',
      description: `Cold open: ${draft.coldOpen.wordCount} mots (max 20)`,
      severity: 'warning',
      suggestedFix: 'Raccourcir à max 15 mots, télégraphique',
      source: 'code',
    });
  }

  // 7b. Cold open value-claim must arrive within ~15 seconds (YouTube growth rule).
  // Coverage : refuse "bonjour bienvenue", "je m'appelle", "dans cette vidéo on va...".
  // Threshold: 4s estimated for 10 words at 150 wpm; cold open should hit value claim
  // within 15s i.e. its narration must be ≤45 words AND skip greeting fillers.
  if (draft.coldOpen) {
    const txt = (draft.coldOpen.narration ?? '').toLowerCase().trim();
    const greetingPatterns = [
      /^bonjour\b/, /^bienvenue\b/, /^salut\b/, /^hello\b/,
      /^aujourd'hui dans cette vidéo/, /^dans cette vidéo/,
      /^je m'appelle\b/, /^moi c'est\b/, /^je suis\b/,
      /^chers? (?:amis|abonnés|spectateurs|viewers)\b/,
    ];
    for (const re of greetingPatterns) {
      if (re.test(txt)) {
        issues.push({
          type: 'structure',
          segmentId: 'coldOpen',
          description: `Cold open commence par un greeting/filler ("${txt.slice(0, 40)}...") — value claim retardée`,
          severity: 'blocker',
          suggestedFix: 'Démarrer directement par le hook (paradoxe, chiffre saillant, cliffhanger). Pas de "bonjour", pas de "dans cette vidéo".',
          source: 'code',
        });
        break;
      }
    }
    // Hard length cap: 15s ≈ 45 words at Fish ~190 wpm. Above that, value claim drift past 15s.
    if (draft.coldOpen.wordCount > 45) {
      issues.push({
        type: 'length',
        segmentId: 'coldOpen',
        description: `Cold open ${draft.coldOpen.wordCount} mots > 45 (value claim après 15s — viewer décroche)`,
        severity: 'blocker',
        suggestedFix: 'Couper à ≤ 20 mots. Le hook doit être télégraphique.',
        source: 'code',
      });
    }
  }

  // 8. Empty narrations
  for (const seg of draft.segments) {
    if (!seg.narration || seg.narration.trim().length < 10) {
      issues.push({
        type: 'structure',
        segmentId: seg.segmentId,
        description: `Narration vide ou trop courte dans ${seg.segmentId}`,
        severity: 'blocker',
        source: 'code',
      });
    }
  }

  // 9. Hallucination check: numbers in narration vs known data sources
  if (flagged) {
    const known = buildKnownNumbers(flagged);
    for (const seg of draft.segments) {
      const nums = extractSignificantNumbers(seg.narration);
      for (const n of nums) {
        // Check if this number (or close approximation ±1%) exists in known data
        const isKnown = [...known].some(k => Math.abs(k - n) / Math.max(k, 1) < 0.015);
        if (!isKnown) {
          issues.push({
            type: 'compliance',
            segmentId: seg.segmentId,
            description: `Niveau ${n} non trouvé dans les données sources — potentielle hallucination`,
            severity: 'warning',
            suggestedFix: `Vérifier si ${n} provient des données. Si non, remplacer par un niveau réel ou supprimer.`,
            source: 'code',
          });
        }
      }
    }
  }

  // 10. Temporal consistency: "cette semaine" on Monday = only today's events
  if (flagged) {
    const dayOfWeek = new Date(flagged.date + 'T12:00:00Z').getDay();
    if (dayOfWeek === 1) { // Monday
      const weekClaims = fullText.match(/cette semaine|cette sem\.|de la semaine/gi);
      if (weekClaims && weekClaims.length > 0) {
        issues.push({
          type: 'compliance',
          description: `"cette semaine" utilisé un lundi — impossible d'avoir des événements répétés "cette semaine" le premier jour`,
          severity: 'warning',
          suggestedFix: 'Remplacer par "aujourd\'hui" ou "en début de semaine" ou retirer la référence temporelle',
          source: 'code',
        });
      }
    }
  }

  // 11. "seul" comparative claims: check if truly unique
  if (flagged) {
    const seulMatches = fullText.matchAll(/seul[e]?\s+(indice|actif|devise|crypto|marché)\s+(?:en\s+)?(baisse|hausse)/gi);
    for (const m of seulMatches) {
      issues.push({
        type: 'compliance',
        description: `Claim "${m[0]}" — vérifier que c'est factuel sur TOUS les actifs du groupe`,
        severity: 'warning',
        suggestedFix: 'Si non vérifié, utiliser "parmi les rares" au lieu de "seul"',
        source: 'code',
      });
    }
  }

  // 12. Day-of-week consistency: verify day names match actual dates
  if (flagged) {
    const anchors = buildTemporalAnchors(flagged.date, flagged.publishDate);
    const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    // Match patterns like "dimanche soir", "ce lundi", "mardi prochain", "demain dimanche"
    const dayMentions = fullText.matchAll(
      /(?:demain|après-demain|ce|prochain|hier)\s+(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)/gi
    );
    for (const m of dayMentions) {
      const mentionedDay = m[1].toLowerCase();
      const prefix = m[0].toLowerCase().replace(/\s+\S+$/, '').trim(); // "demain", "ce", etc.

      let expectedDay: string | undefined;
      if (prefix === 'demain') {
        // "demain" = pubDate + 1 = snapDate + 2
        const d = new Date(Date.UTC(
          parseInt(anchors.snapDate.slice(0, 4)),
          parseInt(anchors.snapDate.slice(5, 7)) - 1,
          parseInt(anchors.snapDate.slice(8, 10)) + 2,
        ));
        expectedDay = JOURS[d.getUTCDay()];
      } else if (prefix === 'hier') {
        // "hier" = snapDate (from viewer's perspective)
        const d = new Date(anchors.snapDate + 'T12:00:00Z');
        expectedDay = JOURS[d.getUTCDay()];
      } else if (prefix === 'ce' || prefix === 'aujourd\'hui') {
        // "ce vendredi" = pubDate
        const d = new Date(anchors.pubDate + 'T12:00:00Z');
        expectedDay = JOURS[d.getUTCDay()];
      }

      if (expectedDay && mentionedDay !== expectedDay) {
        issues.push({
          type: 'compliance',
          description: `"${m[0]}" incorrect — ${prefix} = ${expectedDay}, pas ${mentionedDay} (snap: ${anchors.snapDate}, pub: ${anchors.pubDate})`,
          severity: 'blocker',
          suggestedFix: `Remplacer "${mentionedDay}" par "${expectedDay}"`,
          source: 'code',
        });
      }
    }

    // ── New rules enforcing C3 prompt deterministically ──

    // 13. Anglicismes (blacklist rapide — Haiku fait la 2e passe)
    for (const seg of draft.segments) {
      for (const pattern of ANGLICISMES_BLACKLIST) {
        const m = seg.narration.match(pattern);
        if (m) {
          issues.push({
            type: 'tone',
            segmentId: seg.segmentId,
            description: `Anglicisme "${m[0]}" interdit (règle C3 : zéro anglicisme)`,
            severity: 'blocker',
            suggestedFix: `Remplacer "${m[0]}" par l'équivalent français naturel`,
            source: 'code',
          });
        }
      }
    }

    // 14. Sigles techniques (whitelist — flag tout autre MAJ 2-6 lettres)
    // IMPORTANT : on strip les tickers quoted ("CL=F", "META") avant le match
    // pour ne pas les flagger (ils sont gérés par la règle 15).
    const sigleRe = /\b([A-Z]{2,6})\b/g;
    for (const seg of draft.segments) {
      const cleaned = seg.narration.replace(/"[^"]+"/g, '');
      const found = new Set<string>();
      for (const m of cleaned.matchAll(sigleRe)) {
        const sigle = m[1];
        if (SIGLES_WHITELIST.has(sigle)) continue;
        if (found.has(sigle)) continue;
        found.add(sigle);
        issues.push({
          type: 'tone',
          segmentId: seg.segmentId,
          description: `Sigle technique "${sigle}" en clair (règle C3 : nom complet français)`,
          severity: 'blocker',
          suggestedFix: `Remplacer "${sigle}" par son nom français complet`,
          source: 'code',
        });
      }
    }

    // 15. Tickers nus — nom de société sans guillemets/ticker associé
    const companies = loadCompanyNames();
    for (const seg of draft.segments) {
      for (const { name, symbol } of companies) {
        // Escape regex special chars in name
        const escName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escSym = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRe = new RegExp(`\\b${escName}\\b`, 'g');
        const matches = [...seg.narration.matchAll(nameRe)];
        if (matches.length === 0) continue;
        // If the ticker symbol also appears in quotes nearby, it's fine
        const tickerQuoted = new RegExp(`"${escSym}"`);
        if (tickerQuoted.test(seg.narration)) continue;
        issues.push({
          type: 'tone',
          segmentId: seg.segmentId,
          description: `Société "${name}" nommée en clair sans ticker (règle C3 : "${symbol}" entre guillemets)`,
          severity: 'blocker',
          suggestedFix: `Remplacer "${name}" par "${symbol}" entre guillemets (description après si première mention)`,
          source: 'code',
        });
        break; // Un blocker par segment pour cette règle suffit
      }
    }

    // 15b. Redondance ticker + nom — pattern "SYMBOL", <NomComplet|PremierMot>, (,|.|space)
    // Le ticker est déjà prononcé comme le nom. Ajouter le nom = double mention audio + sous-titre.
    // On matche nom complet OU premier mot significatif (Opus raccourcit souvent : "SoftBank Group" → "SoftBank").
    for (const seg of draft.segments) {
      for (const { name, symbol } of companies) {
        const escSym = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Candidats de nom : nom complet + premier mot (si > 3 lettres, pour éviter "A", "La", etc.)
        const nameCandidates = new Set<string>();
        nameCandidates.add(name);
        const firstWord = name.split(/\s+/)[0];
        if (firstWord && firstWord.length > 3) nameCandidates.add(firstWord);
        // Deux premiers mots (pour "Stanley Black and Decker" → "Stanley Black")
        const firstTwoWords = name.split(/\s+/).slice(0, 2).join(' ');
        if (firstTwoWords && firstTwoWords !== firstWord && firstTwoWords.length > 6) {
          nameCandidates.add(firstTwoWords);
        }
        let matched = false;
        for (const candidate of nameCandidates) {
          const escName = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const redundantRe = new RegExp(`"${escSym}"\\s*,\\s*${escName}\\s*(,|\\.|\\s+[a-zéèàùç])`, 'i');
          if (redundantRe.test(seg.narration)) {
            issues.push({
              type: 'tone',
              segmentId: seg.segmentId,
              description: `Redondance "${symbol}" + "${candidate}" : le ticker prononce déjà le nom, ça sort deux fois en audio`,
              severity: 'blocker',
              suggestedFix: `Retirer "${candidate}, " après "${symbol}". Ajouter un rôle/secteur à la place si présentation nécessaire (ex: "${symbol}", le fabricant d'outillage, ...)`,
              source: 'code',
            });
            matched = true;
            break;
          }
        }
        if (matched) continue; // continue avec la société suivante, on veut détecter toutes les redondances du segment
      }
    }

    // 15c. Redondance paire FX / indice en clair + ticker quoted
    // Pattern : "le dollar-yen USDJPY=X" → phonétique rend "le dollar-yen dollar yène" (double)
    const fxPatterns = [
      { re: /\b(le\s+)?dollar[\s-]yen\s+"([^"]+)"/i, name: 'dollar-yen', expectedTicker: /JPY/i },
      { re: /\b(l'|l')?euro[\s-]dollar\s+"([^"]+)"/i, name: 'euro-dollar', expectedTicker: /EUR.*USD|USD.*EUR/i },
      { re: /\b(la\s+)?livre[\s-]dollar\s+"([^"]+)"/i, name: 'livre-dollar', expectedTicker: /GBP.*USD/i },
      { re: /\b(l'|l')?euro[\s-]livre\s+"([^"]+)"/i, name: 'euro-livre', expectedTicker: /EUR.*GBP/i },
      { re: /\b(l'|l')?euro[\s-]yen\s+"([^"]+)"/i, name: 'euro-yen', expectedTicker: /EUR.*JPY/i },
      { re: /\b(l')?indice\s+(allemand|français|anglais|britannique|européen|américain|japonais|chinois)\s+"(\^[A-Z]+)"/i, name: 'indice-pays', expectedTicker: /^\^/i },
    ];
    for (const seg of draft.segments) {
      for (const { re, name, expectedTicker } of fxPatterns) {
        const m = seg.narration.match(re);
        if (m) {
          const ticker = m[m.length - 1];
          if (expectedTicker.test(ticker)) {
            issues.push({
              type: 'tone',
              segmentId: seg.segmentId,
              description: `Redondance "${name}" + "${ticker}" : le ticker prononce déjà le nom de la paire, ça sort deux fois en audio`,
              severity: 'blocker',
              suggestedFix: `Retirer "${name}" et garder uniquement "${ticker}" (ou "${ticker}", la paire qui reflète [contexte], si présentation nécessaire)`,
              source: 'code',
            });
          }
        }
      }
    }

    // 16. Chiffres non convertis en toutes lettres (hors tickers type "^GSPC" ou "CL=F")
    // On flagge tout digit qui n'est pas dans un ticker quoted.
    const digitRe = /\d+/g;
    for (const seg of draft.segments) {
      // Strip quoted tickers first (they may contain digits legitimately)
      const cleaned = seg.narration.replace(/"[^"]+"/g, '');
      const matches = [...cleaned.matchAll(digitRe)];
      if (matches.length > 0) {
        const samples = matches.slice(0, 3).map(m => m[0]).join(', ');
        issues.push({
          type: 'tone',
          segmentId: seg.segmentId,
          description: `Chiffres non convertis en lettres : ${samples} (règle C3 : TOUS les nombres en toutes lettres)`,
          severity: 'blocker',
          suggestedFix: `Écrire les nombres en toutes lettres (ex: "quatre mille cinq cents" au lieu de "4500")`,
          source: 'code',
        });
      }
    }

    // 17. Parenthèses et crochets interdits
    for (const seg of draft.segments) {
      if (/[(\[]/.test(seg.narration)) {
        issues.push({
          type: 'structure',
          segmentId: seg.segmentId,
          description: `Parenthèses ou crochets dans la narration (règle C3 : pas de parenthèses, pas de crochets)`,
          severity: 'blocker',
          suggestedFix: `Supprimer les parenthèses/crochets, reformuler en une phrase`,
          source: 'code',
        });
      }
    }

    // 18. Tirets en cascade (plus de 2 em-dash dans une même phrase)
    for (const seg of draft.segments) {
      const sentences = seg.narration.split(/[.!?]+/);
      for (const sent of sentences) {
        const dashCount = (sent.match(/—/g) ?? []).length;
        if (dashCount > 2) {
          issues.push({
            type: 'tone',
            segmentId: seg.segmentId,
            description: `Tirets en cascade (${dashCount} dans une phrase) — rupture orale`,
            severity: 'warning',
            suggestedFix: `Scinder la phrase ou remplacer les incises par des virgules`,
            source: 'code',
          });
          break;
        }
      }
    }

    // 19. Langage écrit formel
    for (const seg of draft.segments) {
      for (const pattern of LANGAGE_FORMEL_PATTERNS) {
        const m = seg.narration.match(pattern);
        if (m) {
          issues.push({
            type: 'tone',
            segmentId: seg.segmentId,
            description: `Langage écrit formel "${m[0]}" (règle C3 : écriture parlée uniquement)`,
            severity: 'blocker',
            suggestedFix: `Reformuler en langage parlé naturel`,
            source: 'code',
          });
          break;
        }
      }
    }

    // 20. Recommandations directes (compliance AMF)
    for (const seg of draft.segments) {
      for (const pattern of RECO_DIRECTE_PATTERNS) {
        const m = seg.narration.match(pattern);
        if (m) {
          issues.push({
            type: 'compliance',
            segmentId: seg.segmentId,
            description: `Recommandation directe "${m[0]}" (interdit AMF/MiFID II)`,
            severity: 'blocker',
            suggestedFix: `Reformuler en observation neutre ou question ouverte`,
            source: 'code',
          });
          break;
        }
      }
    }

    // 21. Ton retail/clickbait
    for (const seg of draft.segments) {
      for (const pattern of TON_RETAIL_PATTERNS) {
        const m = seg.narration.match(pattern);
        if (m) {
          issues.push({
            type: 'tone',
            segmentId: seg.segmentId,
            description: `Ton retail "${m[0]}" (règle C3 : sobre, humble, jamais racoleur)`,
            severity: 'blocker',
            suggestedFix: `Remplacer par une formulation sobre`,
            source: 'code',
          });
          break;
        }
      }
    }

    // 22. editorialVisual manquant (requis par C3 pour le directeur artistique)
    for (const seg of draft.segments) {
      if (!seg.editorialVisual || seg.editorialVisual.trim().length < 20) {
        issues.push({
          type: 'structure',
          segmentId: seg.segmentId,
          description: `editorialVisual manquant ou trop court (requis par C3 pour P7 direction artistique)`,
          severity: 'blocker',
          suggestedFix: `Ajouter une scène narrative 1-2 phrases pour illustration éditoriale`,
          source: 'code',
        });
      }
    }

    // 23. Listes à puces dans narration
    for (const seg of draft.segments) {
      if (/^\s*[-•*]\s/m.test(seg.narration) || /^\s*\d+\.\s/m.test(seg.narration)) {
        issues.push({
          type: 'structure',
          segmentId: seg.segmentId,
          description: `Liste à puces détectée dans la narration (interdite — prose orale uniquement)`,
          severity: 'blocker',
          suggestedFix: `Convertir en phrases connectées par des connecteurs parlés`,
          source: 'code',
        });
      }
    }

    // 24. Années abrégées (ex: "avril vingt-six" pour 2026)
    const MOIS = /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i;
    const ANNEE_ABR = new RegExp(
      `\\b${MOIS.source}\\s+(vingt-?(?:et-?un|deux|trois|quatre|cinq|six|sept|huit|neuf)|trente|quarante)\\b`,
      'i',
    );
    for (const seg of draft.segments) {
      const m = seg.narration.match(ANNEE_ABR);
      if (m) {
        issues.push({
          type: 'tone',
          segmentId: seg.segmentId,
          description: `Année abrégée "${m[0]}" — écrire l'année complète (deux mille vingt-six, pas vingt-six)`,
          severity: 'blocker',
          suggestedFix: `Remplacer par "${m[1]} deux mille ${m[2]}"`,
          source: 'code',
        });
      }
    }

    // Also check standalone "Powell parle dimanche" pattern — day name after a verb + temporal context
    const standaloneDayRefs = fullText.matchAll(
      /(?:parle|intervient|publie|décide|annonce|vote|réunit)\s+(?:ce\s+)?(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)/gi
    );
    for (const m of standaloneDayRefs) {
      const mentionedDay = m[1].toLowerCase();
      // Cross-reference with upcomingEvents and events to verify the day name
      const allEvents = [
        ...(flagged.events ?? []),
        ...(flagged.upcomingEvents ?? []),
        ...(flagged.yesterdayEvents ?? []),
      ];
      // Find if there's a matching event and check its actual day
      for (const ev of allEvents) {
        const evDate = new Date(ev.date + 'T12:00:00Z');
        const actualDay = JOURS[evDate.getUTCDay()];
        // Check if the narration sentence likely refers to this event
        const evWords = ev.name.toLowerCase().split(/\s+/);
        const context = m.input?.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + m[0].length + 50).toLowerCase() ?? '';
        const mentionsEvent = evWords.some(w => w.length > 3 && context.includes(w));
        if (mentionsEvent && mentionedDay !== actualDay) {
          issues.push({
            type: 'compliance',
            description: `"${m[0]}" — l'événement "${ev.name}" est le ${ev.date} (${actualDay}), pas ${mentionedDay}`,
            severity: 'blocker',
            suggestedFix: `Remplacer "${mentionedDay}" par "${actualDay}"`,
            source: 'code',
          });
          break;
        }
      }
    }
  }

  return issues;
}

// fixAnglicisms removed — no longer needed with zero-anglicism paradigm.

// ── Semantic validation (Haiku C4) ──────────────────────

function buildC4SystemPrompt(): string {
  return `Tu es un validateur éditorial pour Owl Street Journal — une vidéo quotidienne d'analyse financière. Le narrateur est un hibou anthropomorphe qui TUTOIE le spectateur. Tout le texte est parlé à voix haute.

## TON RÔLE

Tu NE RÉÉCRIS RIEN. Tu signales les problèmes. Point.
Le rédacteur (Opus) a écrit le script. Sa prose est figée. Si tu détectes un blocker, c'est LUI qui corrigera son propre texte — pas toi.

## CE QUE TU DOIS CHERCHER

**ANGLICISMES** — Tout mot anglais dans la narration est un BLOCKER. Ne te limite à aucune liste préétablie. Le code a déjà attrapé les plus évidents (spread, pricing, trader, etc.), mais signale TOUT anglicisme que tu vois, même subtil : move, spot, bench, swap, cap, gap, flat, tight, wide, squeeze, crunch, overhang, fade, tape, order book, dip, flow, book, etc. Tout mot qui n'est pas français pur.

**TON RETAIL ou CLICKBAIT** — "t'as vu", "c'est dingue", "pépite", "to the moon", "explose", "pump", "moon", superlatifs excessifs. Blocker.

**RECOMMANDATIONS DÉGUISÉES** — "le bon moment pour", "on devrait", "il faudrait", "mieux vaut acheter/vendre", "à surveiller pour entrée", "sortie à X niveau". Blocker compliance.

**VOUVOIEMENT** — JAMAIS "vous". Toujours "tu". Blocker.

**CONTINUITÉ J-1 MANQUANTE** — Si le plan éditorial mentionne une continuité J-1, elle DOIT apparaître dans la narration. Blocker si absente.

**INCOHÉRENCE NARRATIVE** — Segment qui ne raconte rien, phrases juxtaposées sans lien, "rapport" au lieu de "récit", chiffre largué sans sens ("et alors ?"). Warning.

**FORMULATION MALADROITE** — Transition cassée, répétition lourde, métaphore ratée. Warning.

## CE QUE TU NE DOIS PAS FAIRE

- NE PAS inventer de problèmes. Si tout est bon, retourne \`{"issues": []}\`.
- NE PAS répéter les problèmes déjà signalés par le code (anglicismes évidents, sigles, chiffres, parenthèses, tickers nus, langage écrit formel — tout ça est déjà attrapé).
- NE PAS renvoyer de validatedScript. Tu n'as AUCUN champ de texte à renvoyer. Uniquement la liste d'issues.

## SORTIE (JSON STRICT)

\`\`\`json
{
  "issues": [
    {
      "type": "tone" | "compliance" | "structure" | "repetition",
      "segmentId": "seg_1",
      "description": "Description précise du problème",
      "severity": "blocker" | "warning",
      "suggestedFix": "Comment corriger",
      "source": "haiku"
    }
  ]
}
\`\`\``;
}

function buildC4UserPrompt(draft: DraftScript, plan: EditorialPlan, analysis: AnalysisBundle): string {
  let prompt = '';

  prompt += `## SCRIPT À VALIDER\n`;
  prompt += `Cold open: "${draft.coldOpen?.narration ?? ''}"\n`;
  prompt += `Thread: "${draft.thread?.narration ?? ''}"\n\n`;
  for (const seg of draft.segments) {
    const analysisForSeg = analysis.segments.find(s => s.segmentId === seg.segmentId);
    prompt += `### ${seg.segmentId} [${seg.depth}] — ${seg.title}\n`;
    prompt += `Narration: "${seg.narration}"\n`;
    prompt += `Confiance C2: ${analysisForSeg?.confidenceLevel ?? '?'}\n\n`;
  }
  prompt += `Closing: "${draft.closing?.narration ?? ''}"\n\n`;

  prompt += `## PLAN ÉDITORIAL (référence)\n`;
  for (const seg of plan.segments) {
    prompt += `- ${seg.id} [${seg.depth}] ${seg.topic}`;
    if (seg.continuityFromJ1) prompt += ` — continuité J-1: ${seg.continuityFromJ1}`;
    prompt += '\n';
  }
  prompt += '\n';

  prompt += `Retourne UNIQUEMENT la liste d'issues. Aucun autre champ.`;

  return prompt;
}

/**
 * Run full P5 validation: mechanical (code) + semantic (Haiku).
 *
 * GARANTIE : le champ `validatedScript` retourné est TOUJOURS le draft Opus original,
 * sans aucune modification. Haiku ne réécrit jamais. Si des blockers sont signalés,
 * la correction passera par un nouvel appel Opus depuis le pipeline (boucle de retry).
 */
/** Strip diacritics + lowercase for keyword matching. */
function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Extract distinctive keywords from a segment for mismatch detection. */
function segmentKeywords(seg: { title?: string; topic?: string; assets?: string[]; narration: string }): string[] {
  const out = new Set<string>();
  // Title words ≥4 chars
  for (const w of (seg.title ?? '').split(/[\s—,'\-]+/)) {
    const n = norm(w);
    if (n.length >= 4) out.add(n);
  }
  // Topic slug
  if (seg.topic) {
    for (const w of seg.topic.split(/[-_\s]+/)) {
      const n = norm(w);
      if (n.length >= 4) out.add(n);
    }
  }
  // Assets (raw + humanized)
  for (const a of seg.assets ?? []) {
    out.add(norm(a));
    // strip ticker suffixes
    out.add(norm(a.replace(/[=^.][\w]+$/, '')));
  }
  // First proper nouns from narration (capitalized words after the first sentence)
  const firstWords = (seg.narration || '').slice(0, 280).split(/[\s,;.—]+/);
  for (const w of firstWords) {
    if (/^[A-Z][a-zA-ZéèàâêûôîçœùÉÈÀÂÊÛÔÎÇŒÙ]{3,}$/.test(w)) {
      out.add(norm(w));
    }
  }
  return Array.from(out).filter((s) => s.length > 0);
}

interface OwlMismatch {
  fromSegmentId: string;
  toSegmentId: string;
  toTitle: string;
  toKeywords: string[];
  currentTransition: string;
}

function detectOwlTransitionMismatches(draft: DraftScript): OwlMismatch[] {
  const segs = draft.segments ?? [];
  const mismatches: OwlMismatch[] = [];
  for (let i = 0; i < segs.length - 1; i++) {
    const cur = segs[i];
    const next = segs[i + 1];
    const tr = (cur.owlTransition ?? '').trim();
    if (!tr) continue;  // no transition = nothing to check
    const trNorm = norm(tr);
    const keywords = segmentKeywords(next);
    const matched = keywords.some((k) => k.length >= 3 && trNorm.includes(k));
    if (!matched) {
      mismatches.push({
        fromSegmentId: cur.segmentId,
        toSegmentId: next.segmentId,
        toTitle: next.title ?? next.segmentId,
        toKeywords: keywords,
        currentTransition: tr,
      });
    }
  }
  return mismatches;
}

interface RewriteOutput {
  fromSegmentId: string;
  owlTransition: string;
}

async function rewriteOwlTransitions(
  draft: DraftScript,
  mismatches: OwlMismatch[],
): Promise<void> {
  const segs = draft.segments ?? [];
  // Build context : the LLM needs to see the full chain even when only a few
  // pairs are off, so transitions chain coherently.
  const system = `You are an editorial transition writer for a French daily market video. You will rewrite the OWL TRANSITION of certain segments so each one truly introduces the NEXT segment.

═══ HARD RULES ═══

- Each transition MUST refer to the actual content of the NEXT segment — name a protagonist / asset / event from the next segment's narration.
- 15–35 words. Spoken French, conversational. End with a hook to keep watching.
- Use a connector ("mais", "et pendant ce temps", "or", "passons à", "maintenant", "à côté de ça") — vary across pairs.
- Don't restate next segment's conclusion — TEASE it.

═══ OUTPUT STRICT JSON ARRAY ═══
[ { "fromSegmentId": "<id>", "owlTransition": "<15-35 words>" } ]
One entry per pair to rewrite.`;

  const pairBlocks = mismatches.map((m) => {
    const fromSeg = segs.find((s) => s.segmentId === m.fromSegmentId);
    const toSeg = segs.find((s) => s.segmentId === m.toSegmentId);
    return `=== PAIR ${m.fromSegmentId} → ${m.toSegmentId} ===
FROM segment "${fromSeg?.title ?? '?'}" — narration tail: "...${(fromSeg?.narration ?? '').slice(-200)}"
TO segment "${toSeg?.title ?? '?'}" — topic: ${toSeg?.topic ?? '?'} — assets: ${(toSeg?.assets ?? []).join('|')}
TO narration head: "${(toSeg?.narration ?? '').slice(0, 400)}"
CURRENT transition (incorrect, doesn't match next segment): "${m.currentTransition}"`;
  }).join('\n\n');

  const user = `${pairBlocks}

Rewrite ${mismatches.length} owl transition(s). Each must concretely evoke the NEXT segment's content. Output the JSON array.`;

  let result: RewriteOutput[];
  try {
    result = await generateStructuredJSON<RewriteOutput[]>(system, user, { role: 'fast' });
  } catch (err) {
    console.warn(`    P5 owl rewrite failed (${(err as Error).message.slice(0, 100)}) — keeping originals`);
    return;
  }

  if (!Array.isArray(result)) return;
  const byId = new Map(result.map((r) => [r.fromSegmentId, r.owlTransition]));
  let updated = 0;
  for (const seg of segs) {
    const t = byId.get(seg.segmentId);
    if (t && t.trim().length > 5) {
      seg.owlTransition = t.trim();
      updated++;
    }
  }
  console.log(`    P5: ${updated}/${mismatches.length} owl transitions rewritten for coherence`);
}

// ── Numerical fact-check for narrated values vs snapshot ──────────

interface NumericalFix {
  segmentId: string;
  oldSentence: string;
  newSentence: string;
  reason: string;
}

interface SnapshotAsset {
  symbol: string;
  name?: string;
  sessionClose?: number;
  changePct?: number;
  price?: number;
}

/**
 * Detect numerical mismatches in segment narrations vs snapshot truth.
 * Uses Haiku because numbers can be written in digits ("157,03") OR in
 * spelled-out French ("cent cinquante-sept"), with rounding variations
 * ("autour de 159"). Pure regex would miss too many cases.
 *
 * Input : draft + array of asset truth cards.
 * Output : list of { segmentId, oldSentence, newSentence, reason }.
 * Empty array if everything checks out.
 */
async function detectNumericalMismatches(
  draft: DraftScript,
  snapshotAssets: SnapshotAsset[],
): Promise<NumericalFix[]> {
  const segments = draft.segments ?? [];
  if (segments.length === 0 || snapshotAssets.length === 0) return [];

  // Build asset truth cards keyed by symbol (only assets actually cited in
  // segments — saves tokens).
  const citedSymbols = new Set<string>();
  for (const seg of segments) {
    for (const a of seg.assets ?? []) citedSymbols.add(a);
  }
  const truthCards = snapshotAssets
    .filter((a) => citedSymbols.has(a.symbol))
    .map((a) => {
      const close = a.sessionClose ?? a.price;
      const change = a.changePct;
      const closeStr = close != null ? close.toFixed(close > 100 ? 2 : 4) : 'n/a';
      const changeStr = change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : 'n/a';
      return `- ${a.symbol}${a.name ? ` (${a.name})` : ''} : sessionClose=${closeStr}  changePct=${changeStr}`;
    });

  if (truthCards.length === 0) return [];

  const system = `You audit a French financial-video script for numerical accuracy. For each segment narration, identify any phrase that quotes a NUMBER (price, percentage, change) about a specific asset where the quoted value DIVERGES from the truth provided.

Numbers can be written :
- In digits : "157,03", "+3.24%", "108 dollars"
- In words FR : "cent cinquante-sept", "trois virgule deux pour cent", "moins cinq pour cent"
- Rounded : "autour de 159", "près de 108", "sous les 160"

Tolerances :
- Price : flag if quoted value differs by > 1.5% from truth (rounding OK)
- Percentage : flag if quoted differs by > 0.5 absolute points from truth
- Asset name in the same sentence — required to flag (don't flag generic numbers)

For each mismatch, output the EXACT problematic sentence (verbatim, copy-paste from narration) AND a corrected sentence keeping tone, length, French spelled-out style if applicable.

Output STRICT JSON ARRAY, empty if everything checks out :
[
  {
    "segmentId": "<id>",
    "oldSentence": "<exact problematic sentence from narration>",
    "newSentence": "<corrected sentence>",
    "reason": "<short reason : asset, quoted value, true value>"
  }
]

Do NOT flag :
- Sentences without a specific asset name
- Sentences quoting trends (e.g. "le cours grimpe") without a number
- Sentences citing past values (yesterday, last week) — only flag if quoting current/J-1 value
- Style choices like "around 100" when truth is 99.7 (within tolerance)`;

  const user = `=== ASSET TRUTH (J-1 close + var) ===
${truthCards.join('\n')}

=== SEGMENTS TO AUDIT ===
${segments.map((s) => `--- segmentId=${s.segmentId} title="${s.title}" assets=${(s.assets ?? []).join('|')} ---\n${s.narration}`).join('\n\n')}

Output the JSON array of mismatches.`;

  try {
    const result = await generateStructuredJSON<NumericalFix[]>(system, user, { role: 'fast' });
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn(`  P5 numerical fact-check failed (${(err as Error).message.slice(0, 100)}) — skipping`);
    return [];
  }
}

/**
 * Apply numerical fixes by string-replacing each oldSentence with newSentence
 * in the matching segment's narration. Mutates draft.segments[*].narration.
 */
function applyNumericalFixes(draft: DraftScript, fixes: NumericalFix[]): number {
  let applied = 0;
  for (const fix of fixes) {
    const seg = draft.segments?.find((s) => s.segmentId === fix.segmentId);
    if (!seg) continue;
    if (!fix.oldSentence || !fix.newSentence) continue;
    if (!seg.narration.includes(fix.oldSentence)) {
      // sentence boundary mismatch — try to be more lenient (Haiku may have
      // trimmed punctuation). Try without trailing punct.
      const trimmed = fix.oldSentence.replace(/[.,;:!?…]$/, '');
      if (seg.narration.includes(trimmed)) {
        seg.narration = seg.narration.replace(trimmed, fix.newSentence);
        applied++;
        continue;
      }
      console.warn(`    P5 numerical: sentence not found verbatim in ${fix.segmentId} — skipped`);
      continue;
    }
    seg.narration = seg.narration.replace(fix.oldSentence, fix.newSentence);
    applied++;
  }
  return applied;
}

export async function runValidation(
  draft: DraftScript,
  plan: EditorialPlan,
  analysis: AnalysisBundle,
  budget: WordBudget,
  flagged?: SnapshotFlagged,
): Promise<ValidationResult> {
  // Step 0: Inter-segment owl-transition coherence check (code-only detection,
  // Haiku rewrite only when mismatches found). Mutates draft.segments[*].owlTransition.
  const owlMismatches = detectOwlTransitionMismatches(draft);
  if (owlMismatches.length > 0) {
    console.log(`  P5 owl transitions: ${owlMismatches.length} mismatch(es) detected (rewriting)`);
    await rewriteOwlTransitions(draft, owlMismatches);
  }

  // Step 0.5: Numerical fact-check vs snapshot. Catches LLM hallucinations on
  // prices and percentages (e.g. "USDJPY autour de 159" when truth is 157).
  // Like owl transitions: Haiku detects + suggests fix, code applies in-place,
  // no full C3 retry.
  if (flagged?.assets && flagged.assets.length > 0) {
    const snapAssets: SnapshotAsset[] = flagged.assets.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      sessionClose: (a.snapshot as any)?.sessionClose,
      changePct: a.changePct,
      price: a.price,
    }));
    const numFixes = await detectNumericalMismatches(draft, snapAssets);
    if (numFixes.length > 0) {
      console.log(`  P5 numerical: ${numFixes.length} mismatch(es) detected (rewriting)`);
      const applied = applyNumericalFixes(draft, numFixes);
      console.log(`    P5 numerical: ${applied}/${numFixes.length} sentences corrected`);
    }
  }

  // Step 1: Mechanical validation (with hallucination checks if flagged data available)
  const mechIssues = validateMechanical(draft, plan, budget, flagged);
  const mechBlockers = mechIssues.filter(i => i.severity === 'blocker');

  if (mechBlockers.length > 0) {
    console.log(`  P5 Code: ${mechBlockers.length} blockers mécaniques`);
    // Log each blocker grouped by type for debugging
    const byType: Record<string, string[]> = {};
    for (const b of mechBlockers) {
      const key = `${b.type}${b.segmentId ? `/${b.segmentId}` : ''}`;
      (byType[key] ??= []).push(b.description);
    }
    for (const [key, descs] of Object.entries(byType)) {
      const sample = descs.slice(0, 3).join(' | ');
      const more = descs.length > 3 ? ` (+${descs.length - 3})` : '';
      console.log(`    · ${key}: ${sample}${more}`);
    }
    return {
      status: 'needs_revision',
      issues: mechIssues,
      validatedScript: draft, // Opus intact
    };
  }

  // Step 2: Semantic validation (Haiku C4) — issues only, no rewriting.
  // SKIP si validation mécanique 100% clean : aucun blocker ni warning.
  // Dans ce cas le draft passe la grille "anglicismes/compliance/sigles/structure" côté code,
  // et l'apport sémantique Haiku est marginal vs son coût (~0.03€/ép).
  // Si warnings existent (ex : longueur +15-30%), on garde Haiku pour détecter les subtilités.
  if (mechIssues.length === 0) {
    console.log('  P5 C4 Haiku — SKIP (validation mécanique 100% clean)');
    return {
      status: 'pass',
      issues: [],
      validatedScript: draft,
    };
  }

  console.log('  P5 C4 Haiku — validation sémantique...');

  try {
    const systemPrompt = buildC4SystemPrompt();
    const userPrompt = buildC4UserPrompt(draft, plan, analysis);

    const result = await generateStructuredJSON<{ issues?: ValidationIssue[] }>(
      systemPrompt,
      userPrompt,
      { role: 'fast', validate: zodValidator(ValidationResponseSchema) as any },
    );

    const allIssues = [
      ...mechIssues,
      ...(result.issues ?? []).map(i => ({ ...i, source: 'haiku' as const })),
    ];

    const hasBlockers = allIssues.some(i => i.severity === 'blocker');
    const haikuBlockerCount = (result.issues ?? []).filter(i => i.severity === 'blocker').length;
    if (haikuBlockerCount > 0) {
      console.log(`    Haiku: ${haikuBlockerCount} blocker(s) signalé(s) — Opus corrigera son propre texte`);
    }

    return {
      status: hasBlockers ? 'needs_revision' : 'pass',
      issues: allIssues,
      validatedScript: draft, // Opus intact — pas de merge, pas de réécriture Haiku
    };
  } catch (err) {
    console.warn(`  C4 Haiku error: ${(err as Error).message.slice(0, 80)}`);
    return {
      status: mechIssues.some(i => i.severity === 'blocker') ? 'needs_revision' : 'pass',
      issues: mechIssues,
      validatedScript: draft,
    };
  }
}
