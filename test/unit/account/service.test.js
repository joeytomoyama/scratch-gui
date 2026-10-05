import {createAccountService} from '../../../src/lib/account/service';

jest.mock('@supabase/supabase-js', () => ({createClient: jest.fn()}));

const ok = {data: {}, error: null};
let auth;
let notify;
let service;

test('tutor access token is read fresh and unavailable while signed out', async () => {
    await expect(service.getAccessToken()).rejects.toThrow('sign in');
    auth.getSession.mockResolvedValue({data: {session: {access_token: 'fresh'}}, error: null});
    await expect(service.getAccessToken()).resolves.toBe('fresh');
});
beforeEach(async () => {
    auth = {
        onAuthStateChange: jest.fn(fn => { notify = fn; }),
        getSession: jest.fn(async () => ({data: {session: null}, error: null})),
        getUser: jest.fn(),
        signInWithPassword: jest.fn(async () => ok),
        signUp: jest.fn(async () => ok),
        resetPasswordForEmail: jest.fn(async () => ok),
        resend: jest.fn(async () => ok),
        updateUser: jest.fn(async () => ok),
        signOut: jest.fn(async () => ok)
    };
    service = createAccountService({auth}, 'http://localhost:8601/editor.html');
    await service.ready;
});
test('signup supplies only editable display metadata and fixed callback', async () => {
    await service.signUp('person@example.com', 'long passphrase 123', 'Person');
    expect(auth.signUp).toHaveBeenCalledWith({email: 'person@example.com', password: 'long passphrase 123',
        options: {emailRedirectTo: 'http://localhost:8601/editor.html', data: {display_name: 'Person'}}});
});
test('email change stops if current password is wrong', async () => {
    notify('SIGNED_IN', {user: {email: 'old@example.com'}});
    auth.signInWithPassword.mockResolvedValue({error: {code: 'invalid_credentials'}});
    await expect(service.changeEmail('new@example.com', 'wrong')).rejects.toThrow('incorrect');
    expect(auth.updateUser).not.toHaveBeenCalled();
});
test('password change passes current password and revokes sessions after success', async () => {
    notify('SIGNED_IN', {user: {email: 'a@example.com'}});
    await service.changePassword('new long password', 'old password');
    expect(auth.updateUser).toHaveBeenCalledWith({password: 'new long password', current_password: 'old password'});
    expect(auth.signOut).toHaveBeenCalledWith({scope: 'global'});
});
test('only verified recovery events switch to reset flow', async () => {
    notify('PASSWORD_RECOVERY', {user: {email: 'a@example.com'}});
    expect(service.getState().recovery).toBe(true);
    await service.changePassword('new long password');
    expect(auth.updateUser).toHaveBeenCalledWith({password: 'new long password'});
    expect(service.getState().recovery).toBe(false);
});
test('password change stops before mutation when reauthentication fails', async () => {
    notify('SIGNED_IN', {user: {id: 'a', email: 'a@example.com'}});
    auth.signInWithPassword.mockResolvedValue({error: {code: 'invalid_credentials'}});
    await expect(service.changePassword('new long password', 'wrong')).rejects.toThrow('incorrect');
    expect(auth.updateUser).not.toHaveBeenCalled();
});
test('slow session restore cannot undo a later signout', async () => {
    let resolveUser;
    auth.getSession.mockResolvedValue({data: {session: {user: {id: 'a'}}}});
    auth.getUser.mockImplementation(() => new Promise(resolve => { resolveUser = resolve; }));
    const restoring = createAccountService({auth}, 'http://localhost:8601/editor.html');
    await Promise.resolve();
    notify('SIGNED_OUT', null);
    resolveUser({data: {user: {id: 'a'}}});
    await restoring.ready;
    expect(restoring.getState().user).toBe(null);
});
test('sign out clears user and recovery and subscriptions can unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);
    notify('SIGNED_OUT', null);
    expect(service.getState().user).toBe(null);
    unsubscribe();
    const count = listener.mock.calls.length;
    notify('SIGNED_IN', {user: {id: 'test'}});
    expect(listener.mock.calls.length).toBe(count);
});
test('recovery survives session refresh and ends after explicit password sign-in', async () => {
    const user = {id: 'a', email: 'a@example.com'};
    notify('PASSWORD_RECOVERY', {user});
    notify('TOKEN_REFRESHED', {user});
    notify('SIGNED_IN', {user});
    expect(service.getState().recovery).toBe(true);
    await service.signIn(user.email, 'a password');
    expect(service.getState().recovery).toBe(false);
});
test('recovery marker is scoped to the signed-in user and cleared on signout', async () => {
    const storage = {getItem: jest.fn(() => 'a'), setItem: jest.fn(), removeItem: jest.fn()};
    const restored = createAccountService({auth}, 'http://localhost:8601/editor.html', storage);
    await restored.ready;
    notify('INITIAL_SESSION', {user: {id: 'a'}});
    expect(restored.getState().recovery).toBe(true);
    notify('SIGNED_IN', {user: {id: 'b'}});
    expect(restored.getState().recovery).toBe(false);
    notify('SIGNED_OUT', null);
    expect(storage.removeItem).toHaveBeenCalledWith('account-recovery');
});
