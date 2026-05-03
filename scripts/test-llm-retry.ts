/**
 * Tests unitaires : retry logic du llm-client.
 * Exécution : npx tsx scripts/test-llm-retry.ts
 */
import { isRetryableError, backoffMs } from '../packages/ai/src/llm-client';

let passed = 0;
let failed = 0;

function expect<T>(actual: T, expected: T, label: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}\n      attendu: ${JSON.stringify(expected)}\n      reçu:    ${JSON.stringify(actual)}`);
  }
}

function expectInRange(actual: number, min: number, max: number, label: string) {
  if (actual >= min && actual <= max) {
    passed++;
    console.log(`  ✓ ${label} (${actual} dans [${min}, ${max}])`);
  } else {
    failed++;
    console.log(`  ✗ ${label} : ${actual} hors de [${min}, ${max}]`);
  }
}

console.log('=== isRetryableError — codes HTTP transitoires ===');
expect(isRetryableError('Anthropic 502 [model]: Bad Gateway'), true, '502 Bad Gateway → retry');
expect(isRetryableError('Anthropic 503 [model]: Service Unavailable'), true, '503 Service Unavailable → retry');
expect(isRetryableError('Anthropic 504 [model]: Gateway Timeout'), true, '504 Gateway Timeout → retry');
expect(isRetryableError('Anthropic 522: Connection timed out'), true, '522 Cloudflare → retry');
expect(isRetryableError('Anthropic 524: A timeout occurred'), true, '524 Cloudflare → retry');
expect(isRetryableError('Anthropic 529 [model]: overloaded_error'), true, '529 overloaded → retry');
expect(isRetryableError('Anthropic 429: rate_limit_error'), true, '429 rate limit → retry');

console.log('\n=== isRetryableError — erreurs réseau ===');
expect(isRetryableError('TypeError: fetch failed'), true, 'fetch failed → retry');
expect(isRetryableError('connect ECONNRESET 192.0.2.1:443'), true, 'ECONNRESET → retry');
expect(isRetryableError('Socket connect ETIMEDOUT'), true, 'ETIMEDOUT → retry');
expect(isRetryableError('Error: getaddrinfo EAI_AGAIN api.anthropic.com'), true, 'EAI_AGAIN DNS → retry');
expect(isRetryableError('socket hang up'), true, 'socket hang up → retry');
expect(isRetryableError('Network error: timeout reached'), true, 'network/timeout → retry');

console.log('\n=== isRetryableError — erreurs PAS retry-able ===');
expect(isRetryableError('Anthropic 401: invalid_api_key'), false, '401 auth → no retry');
expect(isRetryableError('Anthropic 400: invalid_request_error'), false, '400 bad request → no retry');
expect(isRetryableError('Anthropic 403: permission_denied'), false, '403 forbidden → no retry');
expect(isRetryableError('Anthropic 404: not_found'), false, '404 not found → no retry');
expect(isRetryableError('JSON parse failed on attempt 1'), false, 'JSON parse fail → no retry (handled separately)');

console.log('\n=== backoffMs — escalation exponentielle ===');
expectInRange(backoffMs(0), 1600, 2400, 'attempt 0 → ~2000ms ±20%');
expectInRange(backoffMs(1), 4000, 6000, 'attempt 1 → ~5000ms ±20%');
expectInRange(backoffMs(2), 9600, 14400, 'attempt 2 → ~12000ms ±20%');
expectInRange(backoffMs(3), 20000, 30000, 'attempt 3 → ~25000ms ±20%');
expectInRange(backoffMs(10), 20000, 30000, 'attempt > 3 → cap à ~25000ms');

console.log(`\n${passed}/${passed + failed} tests passed`);
process.exit(failed === 0 ? 0 : 1);
