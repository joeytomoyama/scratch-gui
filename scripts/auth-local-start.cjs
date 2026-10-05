const {execFileSync, spawnSync} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const childEnv = {...process.env};
if (process.platform === 'win32') {
    const realDocker = execFileSync('where.exe', ['docker.exe'], {encoding: 'utf8'}).trim().split(/\r?\n/)[0];
    const shimDir = path.resolve(__dirname, '../supabase/.temp/local-docker');
    fs.mkdirSync(shimDir, {recursive: true});
    const compiler = path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
    execFileSync(compiler, ['/nologo', `/out:${path.join(shimDir, 'docker.exe')}`, path.join(__dirname, 'LocalDocker.cs')], {stdio: 'inherit'});
    childEnv.CLASSROOM_REAL_DOCKER = realDocker;
    const pathKey = Object.keys(childEnv).find(key => key.toLowerCase() === 'path') || 'PATH';
    childEnv[pathKey] = `${shimDir}${path.delimiter}${childEnv[pathKey] || ''}`;
}
const network = 'classroom-auth-loopback';
const option = 'com.docker.network.bridge.host_binding_ipv4';
let details;
try {
    details = JSON.parse(execFileSync('docker', ['network', 'inspect', network], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}))[0];
} catch (error) {
    execFileSync('docker', ['network', 'create', '--opt', `${option}=127.0.0.1`, network], {stdio: 'ignore'});
    details = JSON.parse(execFileSync('docker', ['network', 'inspect', network], {encoding: 'utf8'}))[0];
}
if (details.Options[option] !== '127.0.0.1') throw new Error('Refusing to start on a non-loopback Docker network.');
const result = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/supabase/dist/supabase.js'),
    'start', '--network-id', network, '-x', 'realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'], {stdio: 'inherit', env: childEnv});
process.exitCode = result.status === null ? 1 : result.status;
// Docker Desktop may ignore the network default. Fail closed instead of leaving
// the development database/inbox exposed on the LAN. Stop preserves local data.
if (!process.exitCode) {
    const ports = execFileSync('docker', ['ps', '--filter', 'label=com.supabase.cli.project=scratch-gui',
        '--format', '{{.Names}} {{.Ports}}'], {encoding: 'utf8'});
    if (ports.includes('0.0.0.0:') || ports.includes('[::]:')) {
        spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/supabase/dist/supabase.js'), 'stop'], {stdio: 'inherit'});
        console.error('Local Auth stopped: Docker ignored loopback-only port binding. Fix Docker port isolation before retrying. Local data was not intentionally deleted; see docs/accounts.md.');
        process.exitCode = 1;
    }
}
