// Load only named public settings into webpack. Never serialize process.env.
const fs = require('fs');
const path = require('path');
const values = {};
for (const file of ['.env', '.env.local']) {
    const envFile = path.resolve(__dirname, '..', file);
    if (!fs.existsSync(envFile)) continue;
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|BACKEND_BASE_URL)=(.*)$/);
        if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
}
for (const name of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'BACKEND_BASE_URL']) {
    if (process.env[name]) values[name] = process.env[name];
}
if (Boolean(values.SUPABASE_URL) !== Boolean(values.SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error('Configure both the Supabase URL and public key, or leave both unset.');
}
if (values.SUPABASE_URL) {
    const url = new URL(values.SUPABASE_URL);
    if (url.username || url.password || url.search || url.hash) {
        throw new Error('Supabase URL must not contain credentials, query parameters, or a fragment.');
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
        throw new Error('Supabase must use HTTPS except on loopback during development.');
    }
}
if (values.SUPABASE_PUBLISHABLE_KEY) {
    const key = values.SUPABASE_PUBLISHABLE_KEY;
    let isAnon = false;
    try { isAnon = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch (e) { /* not a JWT */ }
    if (!key.startsWith('sb_publishable_') && !isAnon) throw new Error('Only a publishable or legacy anon Supabase key may enter the client build.');
}
if (values.BACKEND_BASE_URL) {
    const url = new URL(values.BACKEND_BASE_URL);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username || url.password || url.search || url.hash) {
        throw new Error('BACKEND_BASE_URL requires HTTPS (HTTP only on loopback), without credentials, query or fragment.');
    }
}
module.exports = values;
