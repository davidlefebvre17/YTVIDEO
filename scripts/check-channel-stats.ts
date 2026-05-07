import 'dotenv/config';
import { getYoutubeClient } from './youtube/auth';

async function main() {
  const yt = getYoutubeClient();
  const r = await yt.channels.list({ part: ['snippet', 'statistics'], mine: true });
  const c = r.data.items?.[0];
  console.log('Channel:', c?.snippet?.title);
  console.log('Subs:', c?.statistics?.subscriberCount);
  console.log('Views:', c?.statistics?.viewCount);
  console.log('Videos:', c?.statistics?.videoCount);
  console.log('Created:', c?.snippet?.publishedAt);

  const v = await yt.search.list({
    part: ['snippet'],
    forMine: true,
    type: ['video'],
    maxResults: 10,
    order: 'date',
  });
  console.log('\nDernières vidéos:');
  for (const item of v.data.items ?? []) {
    console.log(`  ${item.snippet?.publishedAt?.slice(0, 10)} — ${item.snippet?.title}`);
  }
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
