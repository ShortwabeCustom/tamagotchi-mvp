#!/usr/bin/env python3
"""Local or GitHub Linux distribution. Explicit inputs, fail-closed byte inspection.
No deployment. Private values are read only by the verifier, never by build children.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
MAX_FILE = 128 * 1024 * 1024
MAX_TOTAL = 1024 * 1024 * 1024
PUBLIC = {'file.svg', 'globe.svg', 'next.svg', 'vercel.svg', 'window.svg'}
ROOT_INPUTS = {'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json',
               'postcss.config.mjs', 'prisma.config.ts'}
PATTERNS = [re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\r\n]{64,}'),
            re.compile(rb'(?<![A-Za-z0-9+/])AKIA[0-9A-Z]{16}(?![A-Za-z0-9+/])'),
            re.compile(rb'_authToken\s*=\s*[A-Za-z0-9_-]{20,}')]


def fail(message):
    raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def forbidden(name):
    p = PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or '\\' in name or not p.parts:
        return True
    for part in p.parts:
        if part in {'.git', '.npmrc', 'artifacts', 'references', 'logs', '__pycache__'} or part.startswith('.env'):
            return True
        if part.lower().endswith(('.pem', '.key', '.p12', '.pfx', '.log', '.sst', '.zip', '.tgz', '.tar', '.gz', '.br')):
            return True
    return any(p.parts[i] == '.next' and p.parts[i+1] in {'cache','dev'} for i in range(len(p.parts)-1))


def allowed(name):
    return name in {'server.js','package.json','distribution-manifest.json'} or name.startswith(('node_modules/','.next/')) or (name.startswith('public/') and name[7:] in PUBLIC)


def known_values(extra=None):
    # Never return values in reports, errors or child process environment.
    config_path=Path.home()/'.local/state/bety-sprint2b/local.json'
    if os.environ.get('BETY_CI_CONFIG'):
        if os.environ.get('GITHUB_ACTIONS')!='true' or platform.system()!='Linux' or platform.machine()!='x86_64': fail('CI config requires GitHub Linux x64')
        config_path=Path(os.environ['BETY_CI_CONFIG']).resolve()
        if not config_path.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()): fail('CI config outside temporary directory')
    config = json.loads(config_path.read_text())
    values = [config['identitySecret'], config['url'], urllib.parse.urlparse(config['url']).password, config.get('adminPassword')]
    for env_file in ROOT.glob('.env*'):
        if env_file.is_file():
            for line in env_file.read_text().splitlines():
                match = re.match(r'(?:export\s+)?([A-Z_0-9]+)\s*=\s*(.*)', line)
                if match and re.search(r'SECRET|TOKEN|PASSWORD|DATABASE_URL|API_KEY',match[1]):
                    values.append(match[2].strip().strip('"\''))
    if extra:
        values.extend(json.loads(Path(extra).read_text()))
    needles = set()
    for value in values:
        if value and len(value) >= 8:
            raw = value.encode()
            needles.update([raw, value.encode('utf-16le'), base64.b64encode(raw), urllib.parse.quote(value,safe='').encode()])
    if not needles:
        fail('No known values available for inspection')
    return needles


def entries(source, allow_internal_links=False):
    """Final packages reject links; tracing may materialize verified internal links."""
    if source.is_dir():
        if source.is_symlink(): fail('Root symlink forbidden')
        boundary=source.resolve()
        def walk(directory, ancestors):
            for p in sorted(directory.iterdir()):
                relative=p.relative_to(source).as_posix()
                resolved=p.resolve(strict=True)
                if not resolved.is_relative_to(boundary): fail('External link forbidden: '+relative)
                if p.is_symlink() and not allow_internal_links: fail('Symlink forbidden: '+relative)
                if forbidden(relative): fail('Forbidden path: '+relative)
                mode=p.stat().st_mode
                if stat.S_ISDIR(mode):
                    if resolved in ancestors: fail('Link cycle: '+relative)
                    yield from walk(p,ancestors | {resolved})
                    continue
                if not stat.S_ISREG(mode): fail('Non-regular entry: '+relative)
                if p.stat().st_size > MAX_FILE: fail('File exceeds inspection bound: '+relative)
                yield relative,p.read_bytes(),stat.S_IMODE(mode)
        yield from walk(source,{boundary})
    else:
        with tarfile.open(source, 'r:gz') as archive:
            seen = set()
            for item in archive:
                name = item.name
                if name in seen: fail('Duplicate archive path: '+name)
                seen.add(name)
                if forbidden(name): fail('Forbidden archive path: '+name)
                if item.isdir(): continue
                if not item.isfile(): fail('Non-regular archive entry: '+name)
                if item.size > MAX_FILE: fail('Archive member exceeds inspection bound: '+name)
                with archive.extractfile(item) as content: data = content.read(MAX_FILE+1)
                if len(data) != item.size: fail('Unreadable archive member: '+name)
                yield name, data, item.mode


def inspect(source, needles, allow_internal_links=False):
    result = {}; total = 0
    for name,data,mode in entries(source,allow_internal_links):
        if not allowed(name): fail('Not allowlisted: '+name)
        total += len(data)
        if total > MAX_TOTAL: fail('Total inspection bound exceeded')
        if any(value in data for value in needles): fail('Known sensitive value present: '+name)
        if any(pattern.search(data) for pattern in PATTERNS): fail('Sensitive pattern present: '+name)
        result[name] = {'sha256':sha(data),'bytes':len(data),'mode':mode}
    if not result: fail('Empty distribution')
    return result


def verify(source, needles):
    actual = inspect(source,needles)
    manifest = None
    for name,data,_ in entries(source):
        if name == 'distribution-manifest.json': manifest = json.loads(data)
    if not manifest: fail('Missing manifest')
    expected = manifest['files']
    payload = {k:v for k,v in actual.items() if k != 'distribution-manifest.json'}
    if payload != expected: fail('Manifest does not match real contents')
    return {'status':'PASS','files':actual,'totalBytes':sum(v['bytes'] for v in actual.values()),
            'scope':'All regular member bytes, including JS, maps, JSON, WASM and native binaries; known values UTF-8/UTF-16LE/base64/URL encoding and private-key/AWS/npm-token patterns.',
            'limits':'No guarantee for unknown secrets or arbitrary encodings/encryption. Nested archives/precompressed files, symlinks and special files rejected. 128 MiB per file, 1 GiB total.'}


def build(destination):
    destination.mkdir(mode=0o700,parents=True,exist_ok=False)
    home = destination.parent/(destination.name+'-home'); home.mkdir(mode=0o700,exist_ok=False)
    tracked = subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
    copied = {}
    for name in tracked:
        selected = name in ROOT_INPUTS or name.startswith(('src/','prisma/')) or name.startswith('public/') and name[7:] in PUBLIC
        if not selected or '.test.' in name: continue
        source = ROOT/name
        if source.is_symlink() or not source.is_file() or forbidden(name): fail('Invalid build input: '+name)
        target = destination/name; target.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(source,target)
        copied[name] = sha(target.read_bytes())
    # Allowlisted child environment: no inherited app secrets, npm tokens, .env or npmrc.
    env = { 'PATH':os.environ['PATH'], 'HOME':str(home), 'TMPDIR':str(home),
            'npm_config_userconfig':str(home/'user.npmrc'), 'npm_config_globalconfig':str(home/'global.npmrc'),
            'npm_config_cache':str(home/'npm-cache'), 'NEXT_TELEMETRY_DISABLED':'1',
            'DATABASE_URL':'postgresql://build_only:build_only@127.0.0.1:1/build_only' }
    for label,command in [('install',['npm','ci']),('validate',['node_modules/.bin/prisma','validate']),
                           ('build',['npm','run','build'])]:
        with (destination.parent/(destination.name+'-'+label+'.log')).open('wb') as log:
            process = subprocess.run(command,cwd=destination,env=env,stdout=log,stderr=subprocess.STDOUT)
        if process.returncode: fail('Isolated '+label+' failed; inspect its local log')
    metadata = {'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),
                'sourceDirty':bool(subprocess.check_output(['git','diff','--name-only'],cwd=ROOT)),
                'lockSha256':sha((destination/'package-lock.json').read_bytes()),'inputs':copied,
                'node':subprocess.check_output(['node','--version'],env=env).decode().strip(),
                'npm':subprocess.check_output(['npm','--version'],env=env).decode().strip(),
                'nodePlatform':subprocess.check_output(['node','-p','process.platform+"/"+process.arch'],env=env).decode().strip(),
                'libc':platform.libc_ver(), 'runnerImage':{k:os.environ.get(k) for k in ['ImageOS','ImageVersion']},
                'os':platform.system(),'architecture':platform.machine(),
                'runtime':'Inject DATABASE_URL and stable BETY_IDENTITY_SECRET into server process; never ship them. node server.js; PORT and HOSTNAME are runtime settings.',
                'compatibility':'Built for the recorded platform; independent execution must validate the exact archive.'}
    (destination/'build-provenance.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps({'build':str(destination),'status':'PASS','sourceCommit':metadata['commit']}))


def package(build_dir, archive, needles):
    if archive.exists(): fail('Archive already exists')
    standalone = build_dir/'.next/standalone'
    # Inspect tracing output before any selection: forbidden traced files must fail, not disappear.
    inspect(standalone,needles,allow_internal_links=True)
    with tempfile.TemporaryDirectory(prefix='bety-package-') as temp:
        stage = Path(temp)
        shutil.copytree(standalone,stage,dirs_exist_ok=True,symlinks=False)
        shutil.copytree(build_dir/'.next/static',stage/'.next/static',symlinks=True)
        for name in PUBLIC:
            source=build_dir/'public'/name
            if source.exists():
                (stage/'public').mkdir(exist_ok=True); shutil.copyfile(source,stage/'public'/name)
        files=inspect(stage,needles)
        metadata=json.loads((build_dir/'build-provenance.json').read_text());metadata['files']=files
        (stage/'distribution-manifest.json').write_text(json.dumps(metadata,indent=2)+'\n')
        verify(stage,needles)
        archive.parent.mkdir(parents=True,exist_ok=True)
        with tarfile.open(archive,'x:gz',format=tarfile.PAX_FORMAT) as output:
            for name in sorted(verify(stage,needles)['files']):
                output.add(stage/name,arcname=name,recursive=False)
    result=verify(archive,needles)
    archive.with_suffix(archive.suffix+'.verification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'archive':str(archive),'sha256':sha(archive.read_bytes()),'files':len(result['files']),'bytes':archive.stat().st_size,'status':'PASS'}))


def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument('action',choices=['build','package','verify','extract']);parser.add_argument('source',type=Path);parser.add_argument('--output',type=Path);parser.add_argument('--known-values-file',type=Path)
    args=parser.parse_args()
    if args.source.is_symlink(): fail('Root symlink forbidden')
    source=args.source.resolve()
    if args.action=='build': build(source);return
    needles=known_values(args.known_values_file)
    if args.action=='package':
        if not args.output: fail('--output required')
        package(source,args.output.resolve(),needles)
    else:
        result=verify(source,needles)
        if args.action=='extract':
            if not args.output: fail('--output required')
            args.output.mkdir(parents=True,exist_ok=False)
            for name,data,mode in entries(source):
                target=args.output/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);target.chmod(mode & 0o777)
            verify(args.output,needles)
        elif args.output: args.output.write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps({'status':'PASS','files':len(result['files']),'totalBytes':result['totalBytes'],'scope':result['scope'],'limits':result['limits']}))


if __name__=='__main__':
    try: main()
    except Exception as error:
        # File content and environment are never interpolated into a failure.
        print('BLOCKED:',type(error).__name__,str(error) if isinstance(error,ValueError) else 'Operation failed; no sensitive diagnostic emitted')
        raise SystemExit(1)
