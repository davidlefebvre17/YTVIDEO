/**
 * Test the Fish Audio /task endpoint (playground flow)
 * vs the /v1/tts endpoint (current code).
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const apiKey = process.env.FISH_API_KEY!;
const voiceId = process.env.FISH_VOICE_ID!;
if (!apiKey || !voiceId) {
  throw new Error('FISH_API_KEY and FISH_VOICE_ID required');
}

const text = `Le cessez-le-feu américano-iranien s'effondre et Hormuz est de nouveau bloqué.
[pause] Sauf que cette fois, l'horizon a changé.
Ce n'est plus une question de jours.
[pause] C'est une question d'années.
Et cette pression énergétique se diffuse partout, des banques centrales jusqu'à la crédibilité du prochain patron de la banque centrale américaine.`;

const outDir = 'out';
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

async function testTaskEndpoint() {
  console.log('\n=== TEST /task endpoint (playground flow) ===');
  const body = {
    type: 'tts',
    stream: false,
    model: voiceId,
    latency: 'balanced',
    format: 'mp3',
    backend: 's2-pro',
    parameters: {
      text: `<|speaker:0|>${text}`,
      model_id: voiceId,
      format: 'mp3',
      latency: 'balanced',
      backend: 's2-pro',
      normalize: true,
    },
  };

  console.log('POST /task body:', JSON.stringify(body, null, 2));

  const res = await fetch('https://api.fish.audio/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  console.log('Response headers:', Object.fromEntries(res.headers.entries()));

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('audio/') || contentType.includes('octet-stream')) {
    const buf = Buffer.from(await res.arrayBuffer());
    const out = `${outDir}/test-task-direct.mp3`;
    writeFileSync(out, buf);
    console.log(`DIRECT AUDIO → ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
    return;
  }

  const textResp = await res.text();
  console.log(`Body (first 500 chars): ${textResp.slice(0, 500)}`);

  let taskData: any;
  try {
    taskData = JSON.parse(textResp);
  } catch {
    console.log('Response is not JSON');
    return;
  }
  console.log('Parsed:', JSON.stringify(taskData, null, 2));

  const taskId = taskData.task_id || taskData.id || taskData._id;
  if (!taskId) {
    console.log('No task_id found, aborting poll');
    return;
  }
  console.log(`\nPolling task ${taskId}...`);

  const start = Date.now();
  while (Date.now() - start < 60_000) {
    await new Promise(r => setTimeout(r, 1000));
    const pollRes = await fetch(`https://api.fish.audio/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const pollBody = await pollRes.text();
    console.log(`  poll: ${pollRes.status} body: ${pollBody.slice(0, 300)}`);
    let parsed: any;
    try { parsed = JSON.parse(pollBody); } catch { continue; }
    if (parsed.status === 'done' || parsed.status === 'success' || parsed.status === 'completed') {
      const audioId = parsed.audio_id || parsed.result?.audio_id || parsed.result?.id;
      console.log(`DONE. audio_id=${audioId}`);
      if (audioId) {
        const blobRes = await fetch(`https://api.fish.audio/blob/${audioId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const buf = Buffer.from(await blobRes.arrayBuffer());
        const out = `${outDir}/test-task-polled.mp3`;
        writeFileSync(out, buf);
        console.log(`→ ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
      }
      return;
    }
    if (parsed.status === 'error' || parsed.status === 'failed') {
      console.log('Task failed');
      return;
    }
  }
  console.log('Poll timeout');
}

testTaskEndpoint().catch(e => { console.error('ERROR:', e); process.exit(1); });
