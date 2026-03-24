import { DIRECT_MATCH_RULES, STOCK_ALIAS_RULES } from "../packages/ai/src/memory/tagging-rules";

const texts = [
  "Le S&P cède un virgule cinquante et un pour cent à 6506.",
  "Le prix est désormais sous sa moyenne mobile 200 jours à 6624",
  "la SMA 200, c'est le juge de paix des tendances longues.",
  "Hier, elle a cédé. Le RSI à 30, c'est la zone de survente",
  "Maintenant, le pétrole. Le WTI clôture à 98 dollars 23",
];

for (const text of texts) {
  const lower = text.toLowerCase();
  const matches: string[] = [];
  for (const rule of [...DIRECT_MATCH_RULES, ...STOCK_ALIAS_RULES]) {
    for (const p of rule.patterns) {
      if (lower.includes(p.toLowerCase())) {
        matches.push(`${rule.asset} ← "${p}"`);
      }
    }
  }
  console.log(`"${text.slice(0, 60)}"`);
  console.log(`  Matches: ${matches.length ? matches.join(', ') : 'NONE (will keep context)'}`);
  console.log();
}
