/**
 * Crée la playlist "Récap quotidien des marchés" sur la chaîne authentifiée
 * et y ajoute une (ou plusieurs) vidéo existante. Affiche l'ID à mettre dans .env.
 *
 * Usage :
 *   npx tsx scripts/setup-playlist.ts                   # crée la playlist seulement
 *   npx tsx scripts/setup-playlist.ts --add <videoId>   # crée + ajoute la vidéo
 *   npx tsx scripts/setup-playlist.ts --id <playlistId> --add <videoId>   # ajoute à une playlist existante
 *
 * Quota : 50 units (insert playlist) + 50 units (insert item) = 100 units one-shot.
 */
import 'dotenv/config';
import { getYoutubeClient } from './youtube/auth';

const PLAYLIST_TITLE = 'Récap quotidien des marchés';
const PLAYLIST_DESCRIPTION = `Le récap quotidien des marchés financiers en moins de 15 minutes : pétrole, indices, crypto, devises, banques centrales. Chaque jour de bourse, l'analyse des mouvements clés et ce qu'il faut surveiller demain.

⚠️ Contenu informatif et éducatif uniquement. Aucun conseil en investissement.

Owl Street Journal — recherche éditoriale + voix de synthèse.`;
const PLAYLIST_PRIVACY = 'unlisted'; // En rodage — passer à 'public' plus tard

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

async function createPlaylist(): Promise<string> {
  const yt = getYoutubeClient();
  const r = await yt.playlists.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: PLAYLIST_TITLE,
        description: PLAYLIST_DESCRIPTION,
        defaultLanguage: 'fr',
      },
      status: { privacyStatus: PLAYLIST_PRIVACY },
    },
  });
  const id = r.data.id;
  if (!id) throw new Error('Playlist created but no ID returned.');
  return id;
}

async function addVideo(playlistId: string, videoId: string): Promise<void> {
  const yt = getYoutubeClient();
  await yt.playlistItems.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: { kind: 'youtube#video', videoId },
      },
    },
  });
}

async function main() {
  let playlistId = getArg('id');
  const videoId = getArg('add');

  if (!playlistId) {
    console.log(`Creating playlist "${PLAYLIST_TITLE}" (privacy=${PLAYLIST_PRIVACY})...`);
    playlistId = await createPlaylist();
    console.log(`✓ Playlist created`);
    console.log(`  ID:  ${playlistId}`);
    console.log(`  URL: https://www.youtube.com/playlist?list=${playlistId}`);
    console.log(`\n→ Add this line to your .env :`);
    console.log(`  YOUTUBE_PLAYLIST_ID=${playlistId}`);
  }

  if (videoId) {
    console.log(`\nAdding video ${videoId} to playlist ${playlistId}...`);
    await addVideo(playlistId, videoId);
    console.log(`✓ Video added`);
    console.log(`  https://youtu.be/${videoId}`);
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
