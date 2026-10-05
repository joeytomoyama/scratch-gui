const {spawnSync} = require('child_process');
const path = require('path');
const script = path.resolve(__dirname, '../../../scripts/account-build-config.cjs');
const load = (key, url = 'https://example.supabase.co') => spawnSync(process.execPath, [script], {
    env: {...process.env, SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key}, encoding: 'utf8'
});

test('build accepts public keys and rejects secret keys', () => {
    expect(load('sb_publishable_test').status).toBe(0);
    expect(load('sb_secret_test').status).not.toBe(0);
});
test('build rejects legacy service-role keys but accepts anon keys', () => {
    const key = role => `e30.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
    expect(load(key('anon')).status).toBe(0);
    expect(load(key('service_role')).status).not.toBe(0);
});
test('plain HTTP is allowed only on loopback', () => {
    expect(load('sb_publishable_test', 'http://localhost:56321').status).toBe(0);
    expect(load('sb_publishable_test', 'http://example.com').status).not.toBe(0);
});
test('URL cannot embed credentials or secret query parameters', () => {
    expect(load('sb_publishable_test', 'https://user:password@example.com').status).not.toBe(0);
    expect(load('sb_publishable_test', 'https://example.com?secret=value').status).not.toBe(0);
});

test('backend URL requires secure transport except for local development', () => {
    const backend = url => spawnSync(process.execPath, [script], {
        env: {...process.env, BACKEND_BASE_URL: url}, encoding: 'utf8'
    }).status;
    expect(backend('https://backend.example/api')).toBe(0);
    expect(backend('http://127.0.0.1:8080')).toBe(0);
    expect(backend('http://backend.example')).not.toBe(0);
    expect(backend('https://user:secret@backend.example')).not.toBe(0);
    expect(backend('https://backend.example?token=secret')).not.toBe(0);
});
