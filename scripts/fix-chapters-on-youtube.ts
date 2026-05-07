/**
 * Fix les chapitres sur une vidéo YouTube déjà uploadée.
 * Retire les "—", "-", ":" entre timestamp et label dans la description,
 * puis met à jour via youtube.videos.update.
 *
 * Usage : npx tsx scripts/fix-chapters-on-youtube.ts <videoId>
 */
import 'dotenv/config';
import { getYoutubeClient } from './youtube/auth';

const videoId = process.argv[2];
if (!videoId) {
  console.error('Usage: npx tsx scripts/fix-chapters-on-youtube.ts <videoId>');
  process.exit(1);
}

async function main() {
  const youtube = getYoutubeClient();

  const list = await youtube.videos.list({ part: ['snippet'], id: [videoId!] });
  const video = list.data.items?.[0];
  if (!video?.snippet) {
    console.error(`Video ${videoId} not found`);
    process.exit(1);
  }

  const oldDesc = video.snippet.description ?? '';
  const newDesc = oldDesc.replace(
    /(^|\n)(\d{1,2}:\d{2}(?::\d{2})?)\s*[—–\-:|·]\s+/g,
    '$1$2 ',
  );

  if (oldDesc === newDesc) {
    console.log('No chapter format issue found in description.');
    return;
  }

  // Diff preview
  const oldLines = oldDesc.split('\n');
  const newLines = newDesc.split('\n');
  console.log('Changes detected:');
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      console.log(`  - ${oldLines[i]}`);
      console.log(`  + ${newLines[i]}`);
    }
  }

  console.log('\nUpdating video...');
  await youtube.videos.update({
    part: ['snippet'],
    requestBody: {
      id: videoId,
      snippet: {
        ...video.snippet,
        description: newDesc,
      },
    },
  });

  console.log(`✓ Description updated for ${videoId}`);
  console.log(`  https://studio.youtube.com/video/${videoId}/edit`);
  console.log('\nReload the player page — chapters should appear in the player bar within 1-2 min.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
