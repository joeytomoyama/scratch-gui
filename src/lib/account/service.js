import {createClient} from '@supabase/supabase-js';
/* eslint-disable max-len */
import {validateEmail, validatePassword, validateName, publicAuthError} from './validation';

// This is the only module that uses the Supabase SDK. Never put auth tokens in Redux.
export const createAccountService = (client, redirectTo, recoveryStorage) => {
    let state = {loading: true, user: null, recovery: false, error: ''};
    let revision = 0;
    const rememberRecovery = userId => {
        try {
            if (recoveryStorage) {
                if (userId) recoveryStorage.setItem('account-recovery', userId);
                else recoveryStorage.removeItem('account-recovery');
            }
        } catch (e) { /* Browser storage may be unavailable. */ }
    };
    const restoringRecovery = user => {
        try {
            return Boolean(user && recoveryStorage && recoveryStorage.getItem('account-recovery') === user.id);
        } catch (e) {
            return false;
        }
    };
    const listeners = new Set();
    const emit = update => {
        state = {...state, ...update};
        listeners.forEach(fn => fn(state));
    };
    const check = result => {
        if (result.error) throw new Error(publicAuthError(result.error));
        return result.data;
    };
    client.auth.onAuthStateChange((event, session) => {
        // Do not await other auth calls here: the SDK holds its session lock.
        revision++;
        if (event === 'PASSWORD_RECOVERY' && session) rememberRecovery(session.user.id);
        if (!session) rememberRecovery(null);
        emit({loading: false,
            user: session ? session.user : null,
            error: '',
            recovery: Boolean(session && (event === 'PASSWORD_RECOVERY' || restoringRecovery(session.user) ||
                (state.recovery && state.user && state.user.id === session.user.id)))});
    });
    let restoringRevision = revision;
    const ready = client.auth.getSession().then(async result => {
        restoringRevision = revision;
        if (result.error) throw result.error;
        if (result.data.session) {
            const verified = await client.auth.getUser();
            if (revision !== restoringRevision) return;
            if (verified.error) throw verified.error;
            emit({loading: false, user: verified.data.user, recovery: state.recovery || restoringRecovery(verified.data.user)});
        } else emit({loading: false});
    })
        .catch(() => {
            if (revision === restoringRevision) {
                emit({loading: false,
                    user: null,
                    recovery: false,
                    error: 'Your session could not be restored. Please sign in again.'});
            }
        });
    return {
        ready,
        // The SDK refreshes expired sessions. Do not copy this token into UI/Redux.
        getAccessToken: async () => {
            const data = check(await client.auth.getSession());
            if (!data.session) throw new Error('Please sign in to use the tutor.');
            return data.session.access_token;
        },
        getState: () => state,
        subscribe: fn => {
            listeners.add(fn); fn(state); return () => listeners.delete(fn);
        },
        signIn: async (email, password) => {
            const data = check(await client.auth.signInWithPassword({email: validateEmail(email), password}));
            rememberRecovery(null);
            emit({recovery: false});
            return data;
        },
        signUp: async (email, password, name) => {
            check(await client.auth.signUp({email: validateEmail(email),
                password: validatePassword(password),
                options: {emailRedirectTo: redirectTo, data: {display_name: validateName(name)}}}));
        },
        resetPassword: async email => check(await client.auth.resetPasswordForEmail(validateEmail(email), {redirectTo})),
        resend: async email => check(await client.auth.resend({type: 'signup', email: validateEmail(email), options: {emailRedirectTo: redirectTo}})),
        updateName: async name => check(await client.auth.updateUser({data: {display_name: validateName(name)}})),
        changeEmail: async (email, password) => {
            if (!state.user) throw new Error('Please sign in again.');
            check(await client.auth.signInWithPassword({email: state.user.email, password}));
            check(await client.auth.updateUser({email: validateEmail(email)}, {emailRedirectTo: redirectTo}));
        },
        changePassword: async (password, currentPassword) => {
            if (!state.user) throw new Error('Please sign in again.');
            const newPassword = validatePassword(password);
            if (!state.recovery) {
                check(await client.auth.signInWithPassword({email: state.user.email, password: currentPassword}));
            }
            check(await client.auth.updateUser({password: newPassword,
                ...(state.recovery ? {} : {current_password: currentPassword})}));
            rememberRecovery(null);
            emit({recovery: false});
            check(await client.auth.signOut({scope: 'global'}));
        },
        signOut: async (everywhere = false) => check(await client.auth.signOut({scope: everywhere ? 'global' : 'local'}))
    };
};

let singleton;
export const getAccountService = () => {
    if (singleton) return singleton;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    const callback = new URL(`${process.env.ROOT || '/'}editor.html`, location.origin);
    let recoveryStorage;
    try {
        recoveryStorage = window.sessionStorage;
    } catch (e) { /* Optional UI state only, never authorization. */ }
    singleton = createAccountService(createClient(url, key, {
        auth: {flowType: 'pkce',
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'classroom-account'}
    }), callback.href, recoveryStorage);
    return singleton;
};
