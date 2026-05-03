/**
 * YouTube OAuth helper.
 *
 * Manages the OAuth2 client used by `upload-youtube.ts`. Two modes :
 * - **Headless** (default) : reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
 *   from env, returns an authenticated `google.youtube` client. No browser involved.
 * - **Interactive** (called via `npm run publish -- --auth`) : opens a localhost server
 *   on port 53682, opens the consent URL in the user's default browser, exchanges the
 *   returned code for a refresh token, prints it so the user can paste it in `.env`.
 *
 * Scopes :
 * - `youtube.upload` — required for `videos.insert`
 * - `youtube` — required to set thumbnail and update metadata after upload
 */
import { google, type youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as http from 'http';
import { URL } from 'url';
import { exec } from 'child_process';

const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
];

export class MissingCredentialsError extends Error {}

/**
 * Returns an authenticated YouTube client using env-loaded refresh token.
 * Throws MissingCredentialsError if any of the required env vars is missing.
 */
export function getYoutubeClient(): youtube_v3.Youtube {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new MissingCredentialsError(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env. ' +
      'See .env.example for setup steps.',
    );
  }
  if (!refreshToken) {
    throw new MissingCredentialsError(
      'YOUTUBE_REFRESH_TOKEN missing in .env. ' +
      'Run `npm run publish -- --auth` once to obtain it via browser consent.',
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  oauth2.setCredentials({ refresh_token: refreshToken });

  return google.youtube({ version: 'v3', auth: oauth2 });
}

/**
 * Run the interactive consent flow once.
 * Prints the refresh token at the end — the caller must save it to .env manually.
 */
export async function runInteractiveAuth(): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new MissingCredentialsError(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env before running auth flow.',
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force refresh_token return even on re-auth
    scope: SCOPES,
  });

  console.log('\n═══ YouTube OAuth — interactive flow ═══');
  console.log(`Opening browser to authorize:\n  ${authUrl}\n`);
  console.log(`If the browser doesn't open, paste the URL above manually.`);
  console.log(`Listening on ${REDIRECT_URI} for callback...\n`);

  await openBrowser(authUrl);

  const code = await waitForCallback();

  console.log('Code received, exchanging for tokens...');
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      'No refresh_token returned. This usually means the app already has a refresh ' +
      'token stored — revoke access at https://myaccount.google.com/permissions and retry.',
    );
  }

  console.log('\n═══ Success ═══');
  console.log('Add the following line to your .env file:\n');
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log('Then re-run `npm run publish -- --date YYYY-MM-DD`.');
}

/**
 * Open URL in default browser (cross-platform best-effort).
 */
function openBrowser(url: string): Promise<void> {
  return new Promise((resolve) => {
    const platform = process.platform;
    const cmd =
      platform === 'win32'
        ? `start "" "${url}"`
        : platform === 'darwin'
          ? `open "${url}"`
          : `xdg-open "${url}"`;
    exec(cmd, (err) => {
      if (err) console.warn(`(browser auto-open failed — paste URL manually)`);
      resolve();
    });
  });
}

/**
 * Spin up a one-shot HTTP server, wait for the OAuth callback, return the code.
 */
function waitForCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', REDIRECT_URI);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Auth error</h1><p>${error}</p>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Missing code parameter</h1>`);
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<html><body style="font-family: system-ui; padding: 40px;">
            <h1>Authentification réussie</h1>
            <p>Vous pouvez fermer cet onglet et retourner au terminal.</p>
          </body></html>`,
        );
        server.close();
        resolve(code);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      // ready
    });

    server.on('error', (err) => {
      reject(new Error(`Failed to bind ${REDIRECT_URI}: ${(err as Error).message}`));
    });

    // 5 minute timeout
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth callback timed out after 5 minutes.'));
    }, 5 * 60 * 1000);
  });
}

export { OAuth2Client };
