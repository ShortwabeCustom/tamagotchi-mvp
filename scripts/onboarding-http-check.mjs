// Real local HTTP + PostgreSQL check. Never logs or persists cookie values/secrets.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import pg from 'pg';
execFileSync(process.execPath, ['scripts/local-integration.mjs', 'verify'], { stdio: 'ignore' });
const config = JSON.parse(readFileSync(join(homedir(), '.local/state/bety-sprint2b/local.json'), 'utf8'));
const base = process.env.BETY_TEST_ORIGIN ?? 'http://127.0.0.1:3000';
if (!/^http:\/\/127\.0\.0\.1:300[01]$/.test(base)) throw new Error('Only local test server ports are allowed');
const db = new pg.Client({ connectionString: config.url });
await db.connect();
const owned = new Set();
const post = (path, cookie, name = 'María José') => fetch(base + path, { method: 'POST', headers: { origin: base, 'content-type': 'application/json', ...(cookie ? { cookie: `bety_visitor=${cookie}` } : {}) }, body: JSON.stringify({ displayName: name }), signal: AbortSignal.timeout(10000) });
const hash = cookie => createHash('sha256').update(cookie.split('.')[1]).digest('hex');
const prepare = async () => {
  const response = await post('/api/identity/prepare'); assert.equal(response.status, 200);
  const header = response.headers.get('set-cookie'); assert.ok(Boolean(header));
  const cookie = header.split(';')[0].split('=')[1]; owned.add(hash(cookie));
  assert.ok(header.includes('HttpOnly') && /SameSite=lax/i.test(header) && header.includes('Path=/'));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  return cookie;
};
const counts = async cookie => {
  const h = hash(cookie);
  const rows = (await db.query('SELECT id FROM user_profiles WHERE "visitorHash"=$1', [h])).rows;
  const ids = rows.map(r => r.id);
  return { ids, profiles: ids.length,
    memories: Number((await db.query("SELECT count(*) FROM memories WHERE \"userId\"=ANY($1::uuid[]) AND category='identity' AND key='displayName'", [ids])).rows[0].count),
    pets: Number((await db.query('SELECT count(*) FROM pet_states WHERE "userId"=ANY($1::uuid[])', [ids])).rows[0].count) };
};
try {
  const lostPreparation = await prepare(); // Simulated transport discards Set-Cookie before client delivery.
  assert.equal((await counts(lostPreparation)).profiles, 0);
  const cookie = await prepare();
  const noWrite = await counts(cookie); assert.deepEqual([noWrite.profiles, noWrite.memories, noWrite.pets], [0,0,0]);
  assert.equal((await post('/api/identity/verify')).status, 409);
  assert.equal((await post('/api/profile/name')).status, 409);
  assert.equal((await post('/api/identity/verify', cookie)).status, 200);
  const reused = await post('/api/identity/prepare', cookie); assert.ok(reused.headers.get('set-cookie') === null);
  const first = await post('/api/profile/name', cookie, '  María   José  '); assert.equal(first.status, 200);
  await first.arrayBuffer(); // Transport receives full response; registration client deliberately drops it here.
  const committed = await counts(cookie); assert.deepEqual([committed.profiles,committed.memories,committed.pets], [1,1,1]);
  const retry = await post('/api/profile/name', cookie); assert.equal(retry.status, 200);
  const result = await retry.json(); assert.equal(result.firstMemoryCreated, false);
  assert.deepEqual(await counts(cookie), committed);
  const concurrent = await Promise.all(Array.from({ length: 8 }, () => post('/api/profile/name', cookie)));
  assert.ok(concurrent.every(r => r.status === 200));
  const bodies = await Promise.all(concurrent.map(r => r.json())); assert.ok(bodies.every(b => b.firstMemoryCreated === false));
  assert.deepEqual(await counts(cookie), committed);
  const refresh = await fetch(base + '/', { headers: { cookie: `bety_visitor=${cookie}` } });
  const html = await refresh.text(); assert.equal(refresh.status, 200); assert.ok(html.includes('María José') && html.includes('Sabía que volverías'));
  assert.ok(!html.includes(cookie) && !html.includes(cookie.split('.')[1]));
  // Losing identity AFTER an uncertain write must not cause the name route to create another one.
  assert.equal((await post('/api/profile/name')).status, 409);
  assert.deepEqual(await counts(cookie), committed);
  const evidence = { source: 'Real HTTP and independently queried local PostgreSQL', base, lossPoint: 'After first HTTP 200 body fully received and SQL commit verified, before registration client consumes response; prepared cookie retained', firstProfileId: committed.ids[0], recoveredProfileId: (await counts(cookie)).ids[0], ...committed, canonicalName: result.displayName, concurrentRequests: 8, concurrentSuccesses: 8, retryFirstMemoryCreated: result.firstMemoryCreated, refreshRecognized: true, preparationWrites: 0, missingCookieStatus: 409 };
  const output = process.env.BETY_EVIDENCE_FILE;
  if (output) writeFileSync(output, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await db.query('DELETE FROM user_profiles WHERE "visitorHash"=ANY($1::text[])', [[...owned]]);
  await db.end();
}
