/**
 * Extrait la masthead (haut du journal avec le nom) du newspaper_empty.png
 * et produit un JPG 2048x1152 avec le titre en haut sur fond cream.
 *
 * Usage:
 *   npx tsx scripts/extract-newspaper-masthead.ts
 *   npx tsx scripts/extract-newspaper-masthead.ts --out custom.jpg
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SRC = path.resolve(__dirname, '..', 'packages/remotion-app/public/owl-video/newspaper_empty.png');
const DEFAULT_OUT = path.resolve(__dirname, '..', 'newspaper-masthead-2048x1152.jpg');

const argOut = process.argv.indexOf('--out');
const OUT = argOut >= 0 ? path.resolve(process.argv[argOut + 1]) : DEFAULT_OUT;

const TARGET_W = 2048;
const TARGET_H = 1152;
const CREAM = '#f5f0e8';

// Le PNG source est 1920x1080. La masthead (top metadata + titre + rules) tient
// dans les 200 premiers pixels. On extrait cette bande, on la met a l'echelle
// pour la largeur cible (2048), puis on la compose sur un canvas 2048x1152 cream.
const MASTHEAD_HEIGHT = 180; // px sur l'image source — coupe juste au-dessus du marqueur d'article

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source introuvable: ${SRC}`);
    process.exit(1);
  }

  const meta = await sharp(SRC).metadata();
  console.log(`Source: ${SRC} (${meta.width}x${meta.height})`);
  console.log(`Crop masthead: ${meta.width}x${MASTHEAD_HEIGHT} from top`);

  // 1) Crop the top masthead band
  const masthead = await sharp(SRC)
    .extract({ left: 0, top: 0, width: meta.width!, height: MASTHEAD_HEIGHT })
    .toBuffer();

  // 2) Resize to target width, preserve aspect ratio of the crop
  const scaledHeight = Math.round((MASTHEAD_HEIGHT * TARGET_W) / meta.width!);
  const scaled = await sharp(masthead)
    .resize({ width: TARGET_W, height: scaledHeight, fit: 'fill' })
    .toBuffer();

  console.log(`Scaled masthead: ${TARGET_W}x${scaledHeight}`);

  // 3) Compose on cream canvas 2048x1152 — masthead anchored at top
  await sharp({
    create: {
      width: TARGET_W,
      height: TARGET_H,
      channels: 3,
      background: CREAM,
    },
  })
    .composite([{ input: scaled, top: 0, left: 0 }])
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(OUT);

  const stat = fs.statSync(OUT);
  console.log(`OK -> ${OUT} (${(stat.size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
