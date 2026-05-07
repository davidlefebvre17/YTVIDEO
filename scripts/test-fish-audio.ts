/**
 * Test audio Fish — valide que normalize=false + phonétiques propagent correctement.
 *
 * Génère un MP3 avec un texte combinant TOUS les cas critiques :
 * - "Owl Street Journal" → doit dire "aul street journale"
 * - Bitcoin → doit dire "bitconne"
 * - DHL.DE entre guillemets → doit dire "dé ache èl groupe"
 * - Hormuz → doit dire "or-mouz" (forme française)
 * - S&P 500 → "essenne pi cinq cents"
 * - Fed → "Fède"
 *
 * Usage : npx tsx scripts/test-fish-audio.ts
 *
 * Sortie : /tmp/test-fish-audio.mp3 (à écouter pour valider)
 */
import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { preProcessForTTS } from '../packages/ai/src/pipeline/p7-c6-tts-adaptation';
import { fishTTS, FISH_PRESETS } from '../packages/ai/src/p7-audio/fish-tts';

async function main() {
  // Texte de test : reprend la structure réelle de l'owlIntro + segment
  const testText = `Owl Street Journal. Récap quotidien des marchés. Mardi cinq mai. Aujourd'hui : pourquoi le pétrole flambe à Hormuz, ce que prépare la Fed, et Bitcoin qui franchit quatre-vingt mille dollars. C'est parti.

"DHL.DE", le numéro un mondial de la logistique express, publie des résultats du premier trimestre dépassant les attentes de dix pour cent. Le S&P 500 termine en hausse de zéro virgule cinq pour cent.`;

  console.log('═══ Test audio Fish — validation normalize=false ═══\n');
  console.log('Texte d\'entrée (brut) :');
  console.log(testText);
  console.log();

  const adapted = preProcessForTTS(testText);
  console.log('Texte ENVOYÉ à Fish (post preProcessForTTS) :');
  console.log(adapted);
  console.log();

  // Vérifications avant envoi
  const checks: Array<{ label: string; expected: string }> = [
    { label: '"Owl Street Journal" → "aul street journale"', expected: 'aul street journale' },
    { label: '"Bitcoin" → "bitconne"', expected: 'bitconne' },
    { label: '"DHL.DE" → "dé ache èl groupe"', expected: 'dé ache èl groupe' },
    { label: '"Hormuz" → "Ormuz"', expected: 'Ormuz' },
    { label: '"S&P 500" → "essenne pi cinq cents"', expected: 'essenne pi cinq cents' },
    { label: '"Fed" → "Fède"', expected: 'Fède' },
  ];

  console.log('Vérifications phonétiques (avant envoi à Fish) :');
  let allOk = true;
  for (const c of checks) {
    if (adapted.includes(c.expected)) {
      console.log(`  ✓ ${c.label}`);
    } else {
      console.log(`  ✗ ${c.label} — ABSENT du texte adapté`);
      allOk = false;
    }
  }

  if (!allOk) {
    console.error('\n⚠ Certaines phonétiques manquent — abandon avant TTS');
    process.exit(1);
  }

  // Generate audio with normalize: false (default since today)
  const outputPath = path.resolve(__dirname, '..', 'data', 'test-fish-audio.mp3');
  console.log(`\n═══ Génération audio Fish (normalize=false par défaut) ═══`);
  console.log(`  Output : ${outputPath}`);

  const t0 = Date.now();
  await fishTTS({
    text: adapted,
    outputPath,
    format: 'mp3',
    speed: FISH_PRESETS.FOCUS.speed,
    temperature: FISH_PRESETS.FOCUS.temperature,
    // normalize laissé au défaut = false (depuis fix de la session 2026-05-05)
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const stat = fs.statSync(outputPath);
  console.log(`\n✓ Audio généré en ${elapsed}s (${(stat.size / 1024).toFixed(1)} KB)`);
  console.log(`\nEcoute le fichier ${outputPath} et vérifie :`);
  for (const c of checks) {
    console.log(`  - "${c.expected}" prononcé correctement ?`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
