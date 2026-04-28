import fs from 'fs';
import path from 'path';

const dir = 'packages/remotion-app/public/icons/editorial';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
const icons = {};

for (const f of files) {
  const name = f.replace(/\.svg$/, '');
  const content = fs.readFileSync(path.join(dir, f), 'utf-8');
  const match = content.match(/<g [^>]*>([\s\S]*?)<\/g>/);
  if (!match) { console.warn('No <g> in', f); continue; }
  icons[name] = match[1].trim();
}

const names = Object.keys(icons).sort();
const nameUnion = names.map(n => `'${n}'`).join(' | ');
const nameList = names.map(n => `  '${n}',`).join('\n');
const paths = names.map(n => `  ${n}: \`${icons[n]}\`,`).join('\n');

const out = `// AUTO-GENERATED from public/icons/editorial/*.svg (Claude Design handoff 2026-04-22)
// 31 editorial line icons — 128×128 viewBox, 2px stroke (overridable via props)
// Regenerate: npx tsx scripts/gen-editorial-icons.mjs

export type EditorialIconName = ${nameUnion};

export const EDITORIAL_ICON_NAMES: readonly EditorialIconName[] = [
${nameList}
] as const;

export const EDITORIAL_ICON_PATHS: Record<EditorialIconName, string> = {
${paths}
};
`;

fs.writeFileSync('packages/remotion-app/src/components/editorial-icons.ts', out);
console.log('Generated', names.length, 'icons →', 'packages/remotion-app/src/components/editorial-icons.ts');
