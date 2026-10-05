// Copy only the public local connection details. Never write the service-role key.
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const cli = path.resolve(__dirname, '../node_modules/supabase/dist/supabase.js');
const status = JSON.parse(execFileSync(process.execPath, [cli, 'status', '-o', 'json'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}));
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
if (!url || !key || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
    throw new Error('Expected a running local Supabase stack.');
}
const destination = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(destination) && !fs.readFileSync(destination, 'utf8').startsWith('# Generated local Supabase config')) {
    throw new Error('.env.local already has custom settings; leave it intact or move it before running auth:env.');
}
fs.writeFileSync(destination, `# Generated local Supabase config (public settings only)\nSUPABASE_URL=${url}\nSUPABASE_PUBLISHABLE_KEY=${key}\n`);
console.log('Local public config saved to .env.local. Restart npm start.');
