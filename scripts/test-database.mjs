// Shared safety gate for this project's private Mac or disposable GitHub runner database.
import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
export function readTestConfig() {
  if(process.env.GITHUB_ACTIONS==='true' && !process.env.BETY_CI_CONFIG) throw new Error('Disposable CI config required');
  let file=join(homedir(),'.local/state/bety-sprint2b/local.json');
  if(process.env.BETY_CI_CONFIG) {
    if(process.env.GITHUB_ACTIONS!=='true' || process.platform!=='linux' || process.arch!=='x64' || !process.env.RUNNER_TEMP) throw new Error('CI config requires a Linux x64 GitHub runner');
    file=realpathSync(process.env.BETY_CI_CONFIG);
    if(!file.startsWith(resolve(process.env.RUNNER_TEMP)+sep)) throw new Error('CI config outside runner temporary directory');
  }
  const config=JSON.parse(readFileSync(file,'utf8'));const url=new URL(config.url);
  if(url.hostname!=='127.0.0.1' || url.pathname!=='/bety_integration_test' || url.port!==String(config.port)) throw new Error('Test destination not allowed');
  return config;
}
export async function verifiedTestConfig() {
  const config=readTestConfig();
  const label=execFileSync('docker',['inspect','--format','{{ index .Config.Labels "com.bety.integration" }}',config.container],{encoding:'utf8'}).trim();
  if(label!==config.run) throw new Error('Test container ownership mismatch');
  const db=new pg.Client({connectionString:config.url});await db.connect();
  try {
    const {rows:[row]}=await db.query("SELECT current_database() AS db,current_user AS role,shobj_description(d.oid,'pg_database') AS marker,r.rolsuper,r.rolcreatedb,r.rolcreaterole FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()");
    if(row.db!=='bety_integration_test' || row.role!==config.role || row.marker!==`bety-sprint2b:${config.run}` || (process.env.BETY_CI_CONFIG && (row.rolsuper || row.rolcreatedb || row.rolcreaterole))) throw new Error('Database ownership or application role privileges rejected');
  } finally {await db.end();}
  return config;
}
