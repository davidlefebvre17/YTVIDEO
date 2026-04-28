/**
 * Test /v1/tts and /v2/tts with playground-inspired variants.
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const apiKey = process.env.FISH_API_KEY!;
const voiceId = process.env.FISH_VOICE_ID!;

const text = `Le cessez-le-feu américano-iranien s'effondre et Hormuz est de nouveau bloqué.
[pause] Sauf que cette fois, l'horizon a changé.
Ce n'est plus une question de jours.
[pause] C'est une question d'années.
Et cette pression énergétique se diffuse partout, des banques centrales jusqu'à la crédibilité du prochain patron de la banque centrale américaine.`;

const outDir = 'out';
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

type Variant = { label: string; url: string; body: Record<string, unknown>; headers?: Record<string, string> };

const base = {
  text: `<|speaker:0|>${text}`,
  format: 'mp3',
  normalize: true,
  latency: 'balanced',
  reference_id: voiceId,
  backend: 's2-pro',
  prosody: { speed: 1.0, volume: 0 },
};

const textDoubleNewline = text.replace(/\n/g, '\n\n');

const textWithPauses = text.replace(/\n/g, '\n[pause]\n');
const zText = `<|speaker:0|>${textWithPauses}`;

const variants: Variant[] = [
  // Reproduction bug actuel : pas de normalize + [pause] tags
  { label: 'LL_nonorm_withpauses', url: 'https://api.fish.audio/v1/tts',
    body: { text: zText, format: 'mp3', reference_id: voiceId, latency: 'balanced' },
    headers: { model: 's2-pro' } },
  // Fix A : normalize true + [pause]
  { label: 'MM_norm_withpauses', url: 'https://api.fish.audio/v1/tts',
    body: { text: zText, format: 'mp3', reference_id: voiceId, latency: 'balanced', normalize: true },
    headers: { model: 's2-pro' } },
  // Fix B : pas de pause explicite (newlines seulement) + pas de normalize
  { label: 'NN_nonorm_nopauses', url: 'https://api.fish.audio/v1/tts',
    body: { text: `<|speaker:0|>${textDoubleNewline}`, format: 'mp3', reference_id: voiceId, latency: 'balanced' },
    headers: { model: 's2-pro' } },
  // Fix C : newlines seulement + normalize
  { label: 'OO_norm_nopauses', url: 'https://api.fish.audio/v1/tts',
    body: { text: `<|speaker:0|>${textDoubleNewline}`, format: 'mp3', reference_id: voiceId, latency: 'balanced', normalize: true },
    headers: { model: 's2-pro' } },
];

async function runVariant(v: Variant) {
  const out = `${outDir}/fish-variant-${v.label}.mp3`;
  process.stdout.write(`  ${v.label} (${v.url})...`);
  try {
    const res = await fetch(v.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(v.headers || {}),
      },
      body: JSON.stringify(v.body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log(` ✗ ${res.status}: ${err.slice(0, 120)}`);
      return;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('audio') && !ct.includes('octet-stream') && !ct.includes('mpeg')) {
      const b = await res.text();
      console.log(` ? content-type=${ct} body: ${b.slice(0, 200)}`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(out, buf);
    console.log(` ✓ ${(buf.length / 1024).toFixed(0)} KB → ${out}`);
  } catch (e) {
    console.log(` ✗ ${(e as Error).message.slice(0, 120)}`);
  }
}

async function main() {
  console.log(`Testing ${variants.length} variants...\n`);
  for (const v of variants) await runVariant(v);
}

main().catch(console.error);
