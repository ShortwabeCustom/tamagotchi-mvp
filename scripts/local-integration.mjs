// Uses only the exclusive local database created for Sprint 2B. Never prints credentials.
import { spawn } from 'node:child_process';
import { verifiedTestConfig } from './test-database.mjs';
const config=await verifiedTestConfig();
const marker=`bety-sprint2b:${config.run}`;
const mode = process.argv[2] ?? 'verify';
const commands = {
  migrate: ['node_modules/.bin/prisma', ['migrate', 'deploy']],
  dev: ['npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3000']],
  build: ['npm', ['run', 'build']],
  production: ['node_modules/.bin/next', ['start', '-H', '127.0.0.1', '-p', '3001']],
  test: ['npm', ['run', 'test:integration', '--', '--no-file-parallelism']],
  'migration-status': ['node_modules/.bin/prisma', ['migrate', 'status']],
};
if (mode === 'verify') { console.log('Base local exclusiva y pertenencia verificadas.'); }
else {
  if (!commands[mode]) throw new Error('Comando no permitido');
  const [command,args] = commands[mode];
  const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: config.url, BETY_IDENTITY_SECRET: config.identitySecret, BETY_LOCAL_HTTP: "1", BETY_TEST_DB_MARKER: marker, BETY_TEST_DB_ROLE: config.role } });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
