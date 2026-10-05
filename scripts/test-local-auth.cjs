// Real, isolated local Auth smoke test. Uses only the public key, never admin APIs.
const assert = require('node:assert/strict');
const {createClient} = require('@supabase/supabase-js');
const path = require('node:path');
const babel = require('@babel/core');
function loadSource(file) {
    const output = babel.transformFileSync(file, {babelrc: false, presets: ['@babel/preset-env']}).code;
    const mod = {exports: {}};
    const localRequire = name => name.startsWith('.') ? loadSource(path.resolve(path.dirname(file), `${name}.js`)) : require(name);
    new Function('require', 'module', 'exports', output)(localRequire, mod, mod.exports);
    return mod.exports;
}
const {createAccountService} = loadSource(path.resolve(__dirname, '../src/lib/account/service.js'));
const config = require('./account-build-config.cjs');
const url = config.SUPABASE_URL;
assert.equal(new URL(url).hostname, '127.0.0.1', 'This test is restricted to local Supabase.');
const key = config.SUPABASE_PUBLISHABLE_KEY;
const email = `auth-smoke-${Date.now()}@example.test`;
const password = 'Local-only test passphrase 42';
const redirectTo = 'http://localhost:8601/editor.html';
const client = createClient(url, key, {auth: {flowType: 'pkce', autoRefreshToken: false}});
const service = createAccountService(client, redirectTo);
const check = result => { assert.equal(result.error, null, result.error && result.error.message); return result.data; };
async function emailLink(subject, recipient = email) {
    for (let i = 0; i < 20; i++) {
        const inbox = await (await fetch('http://127.0.0.1:56324/api/v1/messages')).json();
        const message = inbox.messages.find(item => item.To.some(to => to.Address === recipient) && item.Subject.includes(subject));
        if (message) {
            const body = await (await fetch(`http://127.0.0.1:56324/api/v1/message/${message.ID}`)).json();
            const link = body.HTML.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&');
            assert.equal(new URL(link).origin, url);
            return link;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Local verification email did not arrive');
}
async function consumeLink(link, allowPending = false) {
    const response = await fetch(link, {redirect: 'manual'});
    const target = new URL(response.headers.get('location'));
    assert.equal(target.origin, 'http://localhost:8601');
    assert.ok(!target.searchParams.has('error'), 'Email link returned an error');
    if (allowPending && !target.searchParams.get('code')) return;
    assert.ok(target.searchParams.get('code'), 'Expected PKCE code');
    check(await client.auth.exchangeCodeForSession(target.searchParams.get('code')));
}
(async () => {
    const signup = check(await client.auth.signUp({email, password, options: {emailRedirectTo: redirectTo, data: {display_name: 'Local smoke'}}}));
    assert.equal(signup.session, null, 'Confirmation must be required');
    assert.ok((await client.auth.signInWithPassword({email, password})).error, 'Unverified login must fail');
    await consumeLink(await emailLink('Confirm'));
    assert.equal(check(await client.auth.getUser()).user.email, email);
    check(await client.auth.updateUser({data: {display_name: 'Updated smoke'}}));
    assert.equal(check(await client.auth.getUser()).user.user_metadata.display_name, 'Updated smoke');
    assert.ok((await client.auth.updateUser({password: 'short'})).error, 'Server must reject weak passwords');
    await assert.rejects(service.changePassword('Another long passphrase 43', 'wrong'), /incorrect/);
    check(await client.auth.signOut());
    assert.ok((await client.auth.signInWithPassword({email, password: 'wrong'})).error);
    check(await client.auth.signInWithPassword({email, password}));
    check(await client.auth.resetPasswordForEmail(email, {redirectTo}));
    await consumeLink(await emailLink('Reset'));
    const newPassword = 'Updated local passphrase 44';
    check(await client.auth.updateUser({password: newPassword}));
    check(await client.auth.signOut({scope: 'global'}));
    assert.ok((await client.auth.signInWithPassword({email, password})).error, 'Old password must fail after reset');
    check(await client.auth.signInWithPassword({email, password: newPassword}));
    await service.changePassword('Final local passphrase 45', newPassword);
    assert.equal(check(await client.auth.getSession()).session, null);
    await service.signIn(email, 'Final local passphrase 45');
    const changedEmail = email.replace('@', '-changed@');
    await service.changeEmail(changedEmail, 'Final local passphrase 45');
    assert.equal(check(await client.auth.getUser()).user.email, email, 'Email must not change before confirmation');
    await consumeLink(await emailLink('Confirm your new email'), true);
    assert.equal(check(await client.auth.getUser()).user.email, email, 'Both addresses must confirm');
    await consumeLink(await emailLink('Confirm your new email', changedEmail), true);
    assert.equal(check(await client.auth.getUser()).user.email, changedEmail);
    check(await client.auth.signOut());
    console.log('PASS: verified signup, rejected unverified/wrong login, profile, server password rules, PKCE reset, old-password rejection, normal password change, double-confirmed email change, signout.');
    console.log(`Local test account retained: ${changedEmail}`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
