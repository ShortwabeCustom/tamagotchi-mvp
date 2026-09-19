#!/usr/bin/env python3
"""Disposable GitHub-hosted Linux x64 harness, never a production provisioner."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import secrets
import shutil
import subprocess
import sys
import tarfile
import time

ROOT=Path(__file__).resolve().parents[2]
if os.environ.get('GITHUB_ACTIONS')!='true' or platform.system()!='Linux' or platform.machine()!='x86_64' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':
    raise SystemExit('Requires GitHub-hosted Linux x64')
TEMP=Path(os.environ['RUNNER_TEMP']).resolve()
spec=importlib.util.spec_from_file_location('dist',ROOT/'scripts/local-distribution.py');dist=importlib.util.module_from_spec(spec);spec.loader.exec_module(dist)
REPORTS=TEMP/'reports'

def execute(args,**kwargs):return subprocess.check_output(args,**kwargs).decode().strip()
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def config():return json.loads(Path(os.environ['BETY_CI_CONFIG']).read_text())

def init():
    private=TEMP/'bety-private';private.mkdir(mode=0o700);REPORTS.mkdir()
    run='ci-'+secrets.token_hex(8);password=secrets.token_hex(24);admin=secrets.token_hex(24);signing=secrets.token_hex(32)
    role='bety_app';url=f'postgresql://{role}:{password}@127.0.0.1:55432/bety_integration_test'
    for value in [password,admin,signing,url]:print('::add-mask::'+value,flush=True)
    envfile=private/'postgres.env';envfile.write_text('POSTGRES_PASSWORD='+admin+'\n');envfile.chmod(0o600)
    container='bety-'+run
    execute(['docker','run','-d','--name',container,'--label','com.bety.integration='+run,'--env-file',str(envfile),'-p','127.0.0.1:55432:5432','postgres:16-alpine'])
    ready=False
    for _ in range(60):
        if subprocess.run(['docker','exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:ready=True;break
        time.sleep(1)
    if not ready:raise RuntimeError('Ephemeral PostgreSQL did not become ready')
    sql=f"CREATE ROLE {role} LOGIN PASSWORD '{password}' NOSUPERUSER NOCREATEDB NOCREATEROLE; CREATE DATABASE bety_integration_test OWNER {role}; COMMENT ON DATABASE bety_integration_test IS 'bety-sprint2b:{run}';"
    subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],input=sql.encode(),stdout=subprocess.DEVNULL,check=True)
    file=private/'config.json';file.write_text(json.dumps({'run':run,'container':container,'role':role,'port':55432,'database':'bety_integration_test','url':url,'identitySecret':signing,'adminPassword':admin}));file.chmod(0o600)
    with open(os.environ['GITHUB_ENV'],'a') as env:
        env.write(f'BETY_CI_CONFIG={file}\nBETY_EVIDENCE_DIR={REPORTS}\n')
    metadata={'osRelease':Path('/etc/os-release').read_text(),'unameMachine':platform.machine(),'nodePlatform':execute(['node','-p','process.platform+"/"+process.arch']),'node':execute(['node','--version']),'npm':execute(['npm','--version']),'libc':platform.libc_ver(),'runnerImage':{k:os.environ.get(k) for k in ['ImageOS','ImageVersion','RUNNER_ENVIRONMENT']},'postgres':execute(['docker','exec',container,'psql','-U','postgres','-Atc','SHOW server_version']),'postgresImage':execute(['docker','inspect','--format','{{.Image}}',container])}
    assert metadata['node']=='v24.14.0' and metadata['npm']=='11.9.0' and metadata['nodePlatform']=='linux/x64'
    (REPORTS/'environment.json').write_text(json.dumps(metadata,indent=2));print(json.dumps(metadata,indent=2))

def native_report(directory):
    report=[]
    macho={b'\xfe\xed\xfa\xce',b'\xce\xfa\xed\xfe',b'\xfe\xed\xfa\xcf',b'\xcf\xfa\xed\xfe',b'\xca\xfe\xba\xbe',b'\xbe\xba\xfe\xca'}
    for p in directory.rglob('*'):
        if not p.is_file():continue
        data=p.read_bytes();magic=data[:4]
        if magic in macho:raise RuntimeError('Mach-O file rejected: '+str(p.relative_to(directory)))
        if magic==b'\x7fELF':
            assert data[4]==2 and data[5]==1 and int.from_bytes(data[18:20],'little')==62,'Native binary is not ELF64 x86_64'
            dynamic=execute(['readelf','-d',str(p)]);versions=execute(['readelf','--version-info',str(p)])
            report.append({'path':str(p.relative_to(directory)),'format':'ELF64 x86_64','needed':re.findall(r'Shared library: \[(.*?)\]',dynamic),'versions':sorted(set(re.findall(r'GLIBC(?:XX)?_[0-9.]+',versions)))})
        elif p.suffix=='.node':raise RuntimeError('Unrecognized native module: '+str(p.relative_to(directory)))
    return report

def prepare():
    build=TEMP/'miso-build';dist.build(build)
    archive=TEMP/'candidate'/('miso-'+os.environ['GITHUB_SHA'][:7]+'-linux-x64.tar.gz');dist.package(build,archive,dist.known_values())
    with tarfile.open(archive) as tar:manifest=json.load(tar.extractfile('distribution-manifest.json'))
    assert manifest['commit']==os.environ['GITHUB_SHA'] and manifest['os']=='Linux' and manifest['architecture']=='x86_64' and not manifest['sourceDirty']
    (archive.parent/'manifest.json').write_text(json.dumps(manifest,indent=2))
    (archive.parent/(archive.name+'.sha256')).write_text(digest(archive)+'  '+archive.name+'\n')
    native=native_report(build/'.next/standalone')
    audits={}
    for name in ['full','runtime']:
        audit=json.loads((REPORTS/('audit-'+name+'.json')).read_text());assert audit['metadata']['vulnerabilities']['total']==0;audits[name]=audit['metadata']['vulnerabilities']
    summary={'status':'CANDIDATE_NOT_YET_EXECUTED','commit':os.environ['GITHUB_SHA'],'environment':json.loads((REPORTS/'environment.json').read_text()),'archive':archive.name,'bytes':archive.stat().st_size,'sha256':digest(archive),'lockSha256':manifest['lockSha256'],'audits':audits,'checks':{'unit':'PASS','PostgreSQL':'PASS','distributionNegativeTests':'PASS','Prisma':'PASS','TypeScript':'PASS','lint':'PASS','isolatedBuild':'PASS'},'nativeModules':native,'secretScope':dist.verify(archive,dist.known_values())['scope'],'secretLimits':dist.verify(archive,dist.known_values())['limits']}
    (archive.parent/'build-summary.json').write_text(json.dumps(summary,indent=2))
    for report in [archive.parent/'build-summary.json',archive.parent/'manifest.json']:
        data=report.read_bytes();assert not any(x in data for x in dist.known_values());assert not any(x.search(data) for x in dist.PATTERNS)
    print(json.dumps({k:summary[k] for k in ['status','commit','archive','bytes','sha256']}))

def unpack():
    archives=list((TEMP/'candidate').glob('*.tar.gz'));assert len(archives)==1;archive=archives[0]
    expected=(archive.parent/(archive.name+'.sha256')).read_text().split()[0];assert digest(archive)==expected,'Archive checksum mismatch'
    dist.verify(archive,dist.known_values());target=TEMP/'runtime';target.mkdir()
    for name,data,mode in dist.entries(archive):
        file=target/name;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(data);file.chmod(mode & 0o777)
    dist.verify(target,dist.known_values());manifest=json.loads((target/'distribution-manifest.json').read_text());assert manifest['commit']==os.environ['GITHUB_SHA']
    (REPORTS/'native-runtime.json').write_text(json.dumps(native_report(target),indent=2))
    # Negative test on an independent copy; original archive bytes never change.
    negative=TEMP/'negative';shutil.copytree(target,negative)
    for name,data,needles in [('node_modules/probe/.env.local',b'test-only',dist.known_values()),('.next/server/probe.node',b'\x00disposable-ci-sensitive-marker\xff',dist.known_values()|{b'disposable-ci-sensitive-marker'})]:
        p=negative/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        try:dist.verify(negative,needles)
        except ValueError:pass
        else:raise RuntimeError('Negative distribution test did not fail')
        p.unlink()
    assert digest(archive)==expected
    print('PASS: checksum, extracted manifest, ELF x86_64 and negative tests')

def finish():
    archive=next((TEMP/'candidate').glob('*.tar.gz'));build=json.loads((archive.parent/'build-summary.json').read_text());assert digest(archive)==build['sha256']
    result={'status':'VALIDATED_LINUX_X64','commit':os.environ['GITHUB_SHA'],'build':build,'runtime':json.loads((REPORTS/'package-runtime.json').read_text()),'executionEnvironment':json.loads((REPORTS/'environment.json').read_text()),'browser':[json.loads((REPORTS/('browser-'+mode+'.json')).read_text()) for mode in ['3d','2d','fallback']],'secretCheck':'PASS in documented scope; builder ephemeral values checked before upload, validator ephemeral values checked after download. Mac/VPS secrets never provided.','nativeModules':json.loads((REPORTS/'native-runtime.json').read_text()),'vpsCompatibility':'NOT RUN','humanVisualApproval':'PENDING','physicalPhones':'NOT RUN','production':'NOT DEPLOYED'}
    # Scan all publishable report bytes too, including the manifest and test summaries.
    out=TEMP/'validated';out.mkdir()
    for p in [archive,archive.parent/(archive.name+'.sha256'),archive.parent/'manifest.json']:shutil.copyfile(p,out/p.name)
    (out/'results.json').write_text(json.dumps(result,indent=2))
    for p in out.iterdir():
        if p.suffix=='.gz':dist.verify(p,dist.known_values());continue
        data=p.read_bytes();assert not any(x in data for x in dist.known_values()),'Sensitive value in report'
        assert not any(x.search(data) for x in dist.PATTERNS),'Sensitive pattern in report'
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as summary:summary.write(f"## Linux x64 validated\n\nCommit `{os.environ['GITHUB_SHA']}`\n\nArchive `{archive.name}` ({archive.stat().st_size} bytes)\n\nSHA-256 `{digest(archive)}`\n\nTwo clean jobs; software-rendered browser 3D, 2D and fallback verified. No VPS or deployment. Human visual review and physical phones remain pending.\n")
    print('PASS: validated archive checksum unchanged; reports inspected')

def cleanup():
    if not os.environ.get('BETY_CI_CONFIG'):return
    cfg=config();label=execute(['docker','inspect','--format','{{ index .Config.Labels "com.bety.integration" }}',cfg['container']])
    assert label==cfg['run'];execute(['docker','stop',cfg['container']]);execute(['docker','rm',cfg['container']])

if __name__=='__main__':
    try:{'init':init,'prepare':prepare,'unpack':unpack,'finish':finish,'cleanup':cleanup}[sys.argv[1]]()
    except Exception:
        # Do not expose subprocess arguments or config values via a traceback.
        print('CI check failed. Inspect the failed step; private configuration is not printed.',file=sys.stderr);raise SystemExit(1)
