// HTTP/SQL acceptance of the extracted package. The server resolves only its own runtime.
import { readFileSync, writeFileSync } from 'node:fs';
import { type, machine } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { verifiedTestConfig } from './test-database.mjs';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import pg from 'pg';
const directory=resolve(process.argv[2]);
const mode=process.argv[3] ?? 'check';
assert.ok(['check','serve','serve-fallback'].includes(mode));
const config=await verifiedTestConfig();
const manifest=JSON.parse(readFileSync(join(directory,'distribution-manifest.json'),'utf8'));
assert.equal(manifest.os,type());
assert.equal(manifest.architecture,machine());
const evidence=process.env.BETY_EVIDENCE_DIR ?? 'artifacts/sprint-2b-distribution';
const base='http://127.0.0.1:3001';
let child; let serverLog='';
const env={PATH:process.env.PATH,HOME:directory,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:'3001',DATABASE_URL:config.url,BETY_LOCAL_HTTP:'1',PET_RENDERER:'3d',NEXT_TELEMETRY_DISABLED:'1'};
async function stop() {
  if(child && child.exitCode===null) { const exited=once(child,'exit');child.kill('SIGTERM');await exited; }
  child=undefined;
}
async function start(withSecret=true,fallback=false,renderer='3d') {
  child=spawn(process.execPath,[join(directory,'server.js')],{cwd:directory,env:{...env,PET_RENDERER:renderer,PET_RENDERER_TIMEOUT_MS:'30000',...(withSecret?{BETY_IDENTITY_SECRET:config.identitySecret}:{}),...(fallback?{PET_RENDERER_TIMEOUT_MS:'100'}:{})},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>{serverLog+=data;});child.stderr.on('data',data=>{serverLog+=data;});
  for(let i=0;i<100;i++) {
    if(child.exitCode!==null) throw new Error('Packaged server exited');
    try { if((await fetch(base,{signal:AbortSignal.timeout(500)})).ok)return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Packaged server readiness timeout');
}
const post=(path,cookie,name='Prueba Paquete Local')=>fetch(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json',...(cookie?{cookie:`bety_visitor=${cookie}`}:{})},body:JSON.stringify({displayName:name}),signal:AbortSignal.timeout(10000)});
if(mode!=='check') {
  await start(true,mode==='serve-fallback');console.log('Packaged server ready at '+base+' (runtime config injected, not packaged)');
  process.on('SIGINT',async()=>{await stop();process.exit(0);});
  process.on('SIGTERM',async()=>{await stop();process.exit(0);});
} else {
  const db=new pg.Client({connectionString:config.url});await db.connect();let ownedHash;
  try {
    await start(false);
    const missing=await post('/api/identity/prepare');assert.equal(missing.status,503);assert.equal(missing.headers.get('set-cookie'),null);
    await stop();await start();
    const html=await (await fetch(base)).text();assert.ok(html.includes('Abrir el sobre'));
    const assets=[...new Set([...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m=>m[1]))];assert.ok(assets.some(p=>p.endsWith('.css')) && assets.some(p=>p.endsWith('.js')));
    for(const asset of assets)assert.equal((await fetch(new URL(asset,base))).status,200);
    for(const route of ['/preview/miso','/preview/identity-race'])assert.equal((await fetch(base+route)).status,404);
    assert.equal((await post('/api/qa/identity-race')).status,404);
    const prepared=await post('/api/identity/prepare');assert.equal(prepared.status,200);assert.equal(prepared.headers.get('cache-control'),'private, no-store');
    const header=prepared.headers.get('set-cookie');assert.ok(header.includes('HttpOnly'));
    const cookie=header.split(';')[0].split('=')[1];ownedHash=createHash('sha256').update(cookie.split('.')[1]).digest('hex');
    assert.equal((await post('/api/identity/verify',cookie)).status,200);
    const saved=await post('/api/profile/name',cookie);assert.equal(saved.status,200);
    const {rows:[profile]}=await db.query('SELECT id FROM user_profiles WHERE "visitorHash"=$1',[ownedHash]);assert.ok(profile.id);
    await saved.body.cancel(); // Simulate lost response after independently verified SQL commit, before parsing the body.
    await stop();await start();
    assert.equal((await post('/api/identity/verify',cookie)).status,200);
    const returned=await (await fetch(base,{headers:{cookie:`bety_visitor=${cookie}`}})).text();assert.ok(returned.includes('Hola, ') && returned.includes('Prueba Paquete Local') && returned.includes('Sabía que volverías'));
    assert.ok(!returned.includes(cookie) && !returned.includes(config.identitySecret));
    const retried=await post('/api/profile/name',cookie);assert.equal((await retried.json()).firstMemoryCreated,false);
    const {rows}=await db.query('SELECT id FROM user_profiles WHERE "visitorHash"=$1',[ownedHash]);assert.equal(rows.length,1);assert.equal(rows[0].id,profile.id);
    if(process.env.GITHUB_ACTIONS==='true') {
      const { browserJourney }=await import('./ci/browser.mjs');
      await browserJourney('3d');
      await stop();await start(true,false,'2d');await browserJourney('2d');
      await stop();await start(true,true);await browserJourney('fallback');
    }
    const report={lossPoint:'SQL commit verified; first response body cancelled without parsing',status:'PASS',packageDirectory:directory,manifestCommit:manifest.commit,missingSecretStatus:503,root:200,assetsChecked:assets,previewStatus:404,identityPrepare:200,identityVerify:200,persisted:true,restartSameIdentity:true,retryDuplicated:false,profileId:profile.id,serverCwd:directory,serverNodePath:'unset',serverHome:directory,configSource:'Private local test configuration, injected only at runtime'};
    writeFileSync(join(evidence,'package-runtime.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  } finally {
    await stop();
    if(ownedHash)await db.query('DELETE FROM user_profiles WHERE "visitorHash"=$1',[ownedHash]);await db.end();
    assert.ok(!serverLog.includes(config.identitySecret) && !serverLog.includes(config.url));
    writeFileSync(join(evidence,'package-server.log'),serverLog);
  }
}
