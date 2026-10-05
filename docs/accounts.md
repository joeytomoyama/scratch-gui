# Accounts (development integration)

The editor has a top-right Account dropdown with email/password sign-up, email
verification and resend, sign-in, password recovery, display-name editing, email
change, password change, and sign-out (this browser or all sessions).

This is an authentication foundation, not a production security certification.
Projects still use the editor's existing local file workflow; there is no online
project persistence, classroom authorization, billing, social login, MFA, account
deletion/export workflow, or account administration yet. Do not enroll real
students until the production/privacy checklist below is addressed.

## Run locally

Requires Node 22+, npm, and a running Docker Desktop with Linux containers.
Use the pinned dependencies in `package-lock.json`:

```sh
npm ci
npm run auth:start
npm run auth:env
npm start -- --port 8601
```

- Editor: <http://localhost:8601/editor.html>
- Test email inbox (Mailpit): <http://127.0.0.1:56324>
- Local Auth/API: <http://127.0.0.1:56321>
- Local PostgreSQL: port 56322; development credentials only.

Create an account with a made-up address such as `student@example.test` and a
unique test password. Open the confirmation email in Mailpit, then open its link
in the **same browser/profile and editor origin** that requested it. PKCE binds
email links to that browser; switching between localhost and 127.0.0.1, using a
different browser, or clearing browser storage can invalidate the flow. Request
a fresh link in that case. Password-reset emails work the same way.

`auth:env` writes only public settings into ignored `.env.local`; restart the
frontend after changing them. It refuses to overwrite a hand-maintained file.
Without configuration, the editor still works and the menu shows setup guidance.
Do not paste CLI status output into tickets: it includes local privileged keys.

`auth:start` uses a dedicated Docker bridge and checks the actual published ports.
On Windows, Docker Desktop ignores the network's default binding address, so a
small project-local adapter (`scripts/LocalDocker.cs`) supplies explicit
`127.0.0.1` addresses to the pinned CLI's Docker publish arguments. The launcher
compiles it with Windows' .NET Framework compiler into ignored `supabase/.temp`
and adjusts PATH only for its child process. No global PATH or Docker settings
are changed. Windows requires the .NET Framework 4.x compiler installed at its
standard Framework64 location. Other platforms use the network binding default.
The launcher stops the stack if wildcard publication is detected; the database
is preserved. Do not bypass that check or port-forward these development ports.
Stop the stack when not testing.
The unused local services are excluded to keep resource usage down. Ports 5632x
avoid Windows-reserved 5432x ranges on this development machine.

```sh
npm run auth:stop
```

Stopping preserves the local database. Do not use `db reset` or `stop --no-backup`
unless deliberately discarding development accounts. The loopback Docker network
may remain after stopping; it contains no account data.

## Architecture and security boundaries

- `src/lib/account/service.js` is the Supabase adapter; the React menu depends on
  its small interface. Replacing the auth provider does not require editing the VM.
- Only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are injected into the build.
  Secret/service-role keys are rejected. Public keys are intentionally public.
- Supabase Auth verifies credentials and confirmation links, hashes passwords,
  enforces password minimum length and rate limits, and issues/refreshes sessions.
  Confirmation and secure email-change settings are enabled in local config.
- Email changes recheck the password and require confirmation at both addresses.
  Normal password changes recheck the password via Auth before updating; recovery
  is driven by the SDK's successful PASSWORD_RECOVERY event, not a URL flag.
- **Important local limitation:** the CLI does not expose Auth's separate
  `security_update_password_require_current_password` setting. The normal UI
  rechecks the password, but this is not a server-wide prohibition on direct API
  password changes by a recently authenticated session. Enable and test the
  server-side setting when configuring hosted Auth. `secure_password_change`
  requires reauthentication for old sessions, not every recent-session change.
- Recovery UI state can survive a same-tab refresh. This marker grants no
  permissions; Supabase still requires a valid authenticated session.
- Session tokens use the SDK's browser storage, not Redux, project files, or VM
  username blocks. This is a normal SPA model, **not HttpOnly-cookie isolation**:
  same-origin XSS can steal sessions. Avoid third-party scripts and unsafe
  extensions; security review/CSP work remains necessary before production.
- `display_name` is editable, untrusted metadata rendered as React text. Never
  use user metadata to authorize student/tutor/admin privileges.
- Sign-out revokes refresh sessions. Already-issued access tokens can remain
  valid until expiry; do not promise instant universal access revocation.
- Auth does not implement project/classroom authorization. Future tables/buckets
  must start deny-by-default, use RLS and server-verified ownership, and include
  tests with distinct accounts. No application tables or public storage buckets
  were introduced here.

## Tests

```sh
npm run test:auth
npm run test:unit -- --runInBand --silent
npm run test:auth:local
npx eslint src/lib/account src/components/account/account-menu.jsx src/components/menu-bar/menu-bar.jsx webpack.config.js
npx webpack --mode development --bail
```

The local smoke test requires the running stack and `.env.local`. It exercises
the real service and Auth server with a unique `@example.test` account, captures
Mailpit emails, exchanges PKCE codes, and checks verification, invalid login,
profile updates, password checks, reset, and sign-out. It uses only the public
key. Test accounts/emails are retained for inspection; no real mail is delivered.
Do not run this script against a remote project (it rejects non-loopback URLs).
Unit tests also cover validation, service behavior, and a sign-out/restore race.
The unrelated legacy GUI test suite still has the limitations recorded in the
cleanup notes; a passing focused suite is not a claim of full editor coverage.

## Before hosted/public use

1. Create a separate Supabase development/staging project; do not reuse local
   keys, database passwords, or signing secrets. Configure HTTPS and exact
   deployed callback URLs, no production wildcard redirects. These local TOML
   settings do not automatically configure a hosted project.
2. Match email confirmation, secure email changes, minimum password length,
   refresh-token rotation and current-password requirements in hosted settings.
   Retest the complete reset/change flows against that deployment.
3. Configure real SMTP, delivery monitoring, email templates and redirect links.
   Add bot protection, abuse controls, appropriate rate limits and breached-
   password protection where available. The local inbox is not a mail service.
4. Review dependency vulnerabilities, CSP/XSS defenses, session lifetime/shared-
   classroom-computer behavior, MFA requirements, audit logs, retention, account
   deletion/export, consent and children's privacy requirements.
5. Independently review auth and authorization before handling student data.
   Nothing in this development milestone is a claim of being “bulletproof.”

Official references: [password auth](https://supabase.com/docs/guides/auth/passwords),
[password security](https://supabase.com/docs/guides/auth/password-security),
[local configuration](https://supabase.com/docs/guides/local-development/cli/config).

## Dependency inventory for this milestone

`@supabase/supabase-js` 2.117.2 (MIT) is the runtime dependency; its auth,
functions, PostgREST, realtime and storage packages are pinned transitively in the
lockfile, along with iceberg-js 0.8.1 (MIT). Their installed license files are
copied into `build/licenses` and `dist/licenses` and linked from About/Licenses.
`supabase` CLI 2.119.0 (MIT) is a development-only dependency. This inventory is
incremental, not a completed audit of the inherited TurboWarp dependency graph.
No dependency security upgrades unrelated to accounts were attempted.

## Verification status — 2026-10-03

- Focused tests: 100 passed across 10 suites using
  `npm run test:unit -- --runInBand --silent --testTimeout=30000`.
  One preceding run hit the inherited 5-second VM save/load timeout while a
  build was running; the isolated rerun passed.
- Changed application files and webpack config pass ESLint; tracked patch
  whitespace checks pass. Development webpack build passes.
- Before the environment stopped, the real local Auth smoke test passed signup,
  verification, bad/unverified sign-in rejection, profile, password validation,
  PKCE recovery, old-password rejection and sign-out. Browser sign-in, session
  restoration on reload, sign-out, and reset-email submission were also verified.
- Docker was subsequently restarted successfully. The expanded real Auth smoke
  test now also passes normal password change and email change, asserting that
  the address remains unchanged until both old and new addresses confirm.
- Latest recovery-focus and malformed-metadata changes have unit coverage;
  recovery after refresh still needs a final live browser pass. No claim of
  production-readiness or exhaustive testing.
- Port-binding blocker resolved: the Windows launcher adapter supplies explicit
  localhost bindings. Verified API 56321, database 56322 and inbox 56324 all
  publish on `127.0.0.1`, not wildcard interfaces. Temporary diagnostic containers
  were removed and the global Docker configuration experiment was reverted.
- The complete real Auth smoke test passes again with loopback-only ports,
  including normal password change and double-confirmed email change.
