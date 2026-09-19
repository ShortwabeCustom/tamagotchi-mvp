// Checks actual installed modules. No network, no MySQL server and no private config output.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { deepmerge } from 'deepmerge-ts';
import { loadConfigFromFile } from '@prisma/config';
const require = createRequire(import.meta.url);
const config = await loadConfigFromFile({ configRoot: process.cwd() });
assert.equal(config.error, undefined);
assert.equal(config.config.schema, resolve('prisma/schema.prisma'));
assert.equal(config.config.migrations.path, resolve('prisma/migrations'));
assert.equal(config.config.datasource.url, process.env.DATABASE_URL);
// Prisma passes deepmerge directly as c12's merger; this app uses plain records,
// strings and paths, not Map values or deepmergeInto/custom merge metadata.
const left = { schema: 'old', migrations: { path: 'migrations' }, datasource: { url: 'test-only' } };
const before = structuredClone(left);
const result = deepmerge(left, { schema: 'new', migrations: { seed: 'test-seed' } });
assert.deepEqual(result, { schema: 'new', migrations: { path: 'migrations', seed: 'test-seed' }, datasource: { url: 'test-only' } });
assert.deepEqual(left, before);
const a = {}; a.self = a; const b = {}; b.self = b;
const merged = deepmerge(a,b); assert.equal(merged.self, merged);
const mysqlRoot = dirname(require.resolve('mysql2/package.json'));
const auth = require(join(mysqlRoot,'lib/commands/auth_switch.js'));
const AuthSwitchRequest = require(join(mysqlRoot,'lib/packets/auth_switch_request.js'));
const packet = new AuthSwitchRequest({ pluginName: 'mysql_clear_password', pluginData: Buffer.alloc(0) }).toPacket();
packet.offset = 4;
assert.throws(() => auth.authSwitchRequest(packet, { config: {}, writePacket() { throw new Error('Unsafe cleartext write'); } }, {}), { code: 'MYSQL_CLEAR_PASSWORD_NOT_ENABLED' });
const { enableCompression } = require(join(mysqlRoot,'lib/compressed_protocol.js'));
await new Promise((resolveTest,reject) => {
  const timer = setTimeout(() => reject(new Error('Compression check timed out')),2000);
  const connection = { write() {}, handlePacket() { reject(new Error('Oversized inflate accepted')); }, _handleNetworkError(error) { clearTimeout(timer); try { assert.equal(error.code,'ERR_BUFFER_TOO_LARGE'); resolveTest(); } catch (failure) { reject(failure); } } };
  enableCompression(connection);
  // Tiny bounded example: 4 KiB expanded bytes with a declared 16-byte cap.
  connection._handleCompressedPacket({ readInt24: () => 16, readBuffer: () => deflateSync(Buffer.alloc(4096)), numPackets: 1 });
});
console.log('PASS: actual Prisma config; c12 merger record semantics; cycle support; MySQL cleartext rejection and bounded inflate. No MySQL connection performed.');
