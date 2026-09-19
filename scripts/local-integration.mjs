// Uses only the exclusive local database created for Sprint 2B. Never prints credentials.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import pg from 'pg';
const config = JSON.parse(readFileSync(join(homedir(), '.local/state/bety-sprint2b/local.json'), 'utf8'));
const url = new URL(config.url);
if (url.hostname !== '127.0.0.1' || url.pathname !== '/bety_integration_test' || url.port !== String(config.port)) throw new Error('Destino de pruebas no permitido');
const label = execFileSync('docker', ['inspect', '--format', '{{ index .Config.Labels "com.bety.integration" }}', config.container], { encoding: 'utf8' }).trim();
if (label !== config.run) throw new Error('El contenedor no pertenece a esta ejecución');
const marker = `bety-sprint2b:${config.run}`;
const client = new pg.Client({ connectionString: config.url });
await client.connect();
const { rows: [identity] } = await client.query("SELECT current_database() AS db, current_user AS role, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
await client.end();
if (identity.db !== 'bety_integration_test' || identity.role !== config.role || identity.marker !== marker) throw new Error('La base no es la instancia exclusiva de pruebas');
const mode = process.argv[2] ?? 'verify';
const commands = {
  migrate: ['node_modules/.bin/prisma', ['migrate', 'deploy']],
  dev: ['npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3000']],
  build: ['npm', ['run', 'build']],
  production: ['node_modules/.bin/next', ['start', '-H', '127.0.0.1', '-p', '3001']],
  test: ['npm', ['run', 'test:integration', '--', '--no-file-parallelism']],
};
if (mode === 'verify') { console.log('Base local exclusiva y pertenencia verificadas.'); }
else {
  if (!commands[mode]) throw new Error('Comando no permitido');
  const [command,args] = commands[mode];
  const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: config.url, BETY_IDENTITY_SECRET: config.identitySecret, BETY_LOCAL_HTTP: "1", BETY_TEST_DB_MARKER: marker, BETY_TEST_DB_ROLE: config.role } });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
