import React from 'react';
import {getAccountService} from '../../lib/account/service';
import {accountDisplayName} from '../../lib/account/validation';
import styles from './account-menu.css';

// Small account forms use inline field handlers; no high-frequency rendering here.
/* eslint-disable react/jsx-no-literals, react/jsx-no-bind, react/jsx-handler-names, max-len, no-negated-condition */
const titles = {signin: 'Welcome back',
    signup: 'Create your account',
    reset: 'Reset your password',
    resend: 'Verify your email',
    profile: 'Account settings',
    email: 'Change email',
    password: 'Change password'};

class AccountMenu extends React.Component {
    constructor (props) {
        super(props);
        this.service = getAccountService();
        this.state = {open: false,
            mode: 'signin',
            user: null,
            loading: Boolean(this.service),
            recovery: false,
            email: '',
            password: '',
            currentPassword: '',
            confirmation: '',
            name: '',
            busy: false,
            error: '',
            message: ''};
        this.root = React.createRef();
        this.trigger = React.createRef();
        this.onOutside = this.onOutside.bind(this);
        this.onKey = this.onKey.bind(this);
        this.submit = this.submit.bind(this);
    }
    componentDidMount () {
        this.mounted = true;
        if (this.service) {
            this.unsubscribe = this.service.subscribe(auth => {
                if (!this.mounted) return;
                this.setState(previous => ({...auth,
                    ...(auth.recovery ? {open: true, mode: 'password'} : {}),
                    ...(auth.user && !previous.user && !auth.recovery ? {mode: 'profile', name: accountDisplayName(auth.user)} : {}),
                    ...(!auth.user && previous.user ? {mode: 'signin', password: '', currentPassword: '', confirmation: ''} : {})
                }));
            });
        }
        document.addEventListener('mousedown', this.onOutside);
        document.addEventListener('keydown', this.onKey);
    }
    componentWillUnmount () {
        this.mounted = false;
        if (this.unsubscribe) this.unsubscribe();
        document.removeEventListener('mousedown', this.onOutside);
        document.removeEventListener('keydown', this.onKey);
    }
    onOutside (event) {
        if (this.root.current && !this.root.current.contains(event.target) && !this.state.busy) this.close();
    }
    onKey (event) {
        if (event.key === 'Escape' && this.state.open && !this.state.busy) {
            event.stopPropagation();
            this.close();
            this.trigger.current.focus();
        }
    }
    close () {
        this.setState({open: false, password: '', currentPassword: '', confirmation: ''});
    }
    navigate (mode) {
        this.setState({mode,
            error: '',
            message: '',
            password: '',
            currentPassword: '',
            confirmation: '',
            name: accountDisplayName(this.state.user)});
    }
    async signOut (everywhere) {
        if (this.state.busy) return;
        this.setState({busy: true, error: '', message: ''});
        try {
            await this.service.signOut(everywhere);
            if (this.mounted) this.setState({mode: 'signin', message: 'You are signed out.'});
        } catch (error) {
            if (this.mounted) this.setState({error: error.message});
        } finally {
            if (this.mounted) this.setState({busy: false});
        }
    }
    async submit (event) {
        event.preventDefault();
        if (this.state.busy || !this.service) return;
        const {mode, email, password, currentPassword, confirmation, name} = this.state;
        this.setState({busy: true, error: '', message: ''});
        try {
            if ((mode === 'signup' || mode === 'password') && password !== confirmation) throw new Error('Passwords do not match.');
            let message = '';
            if (mode === 'signin') await this.service.signIn(email, password);
            if (mode === 'signup') {
                await this.service.signUp(email, password, name);
                message = 'Check your email for a verification link. If you already have an account, sign in or reset your password.';
            }
            if (mode === 'reset') {
                await this.service.resetPassword(email);
                message = 'If an account exists for that address, a reset link is on its way. Open it in this browser.';
            }
            if (mode === 'resend') {
                await this.service.resend(email);
                message = 'If verification is needed, an email is on its way. Open the link in this browser.';
            }
            if (mode === 'profile') {
                await this.service.updateName(name); message = 'Display name updated.';
            }
            if (mode === 'email') {
                await this.service.changeEmail(email, currentPassword);
                message = 'Check both your current and new email addresses to confirm the change.';
            }
            if (mode === 'password') {
                await this.service.changePassword(password, currentPassword);
                message = 'Password changed. Sign in again with your new password.';
            }
            if (this.mounted) this.setState({message, password: '', currentPassword: '', confirmation: ''});
        } catch (error) {
            if (this.mounted) this.setState({error: error.message});
        } finally {
            if (this.mounted) this.setState({busy: false});
        }
    }
    field (key, label, type = 'text', autocomplete = 'off') {
        return (
            <label className={styles.field}>
                {label}
                <input
                    name={key}
                    type={type}
                    autoComplete={autocomplete}
                    value={this.state[key]}
                    maxLength={key === 'name' ? 60 : 254}
                    required
                    disabled={this.state.busy}
                    onChange={event => this.setState({[key]: event.target.value})}
                />
            </label>
        );
    }
    render () {
        const {open, user, loading, recovery, mode, busy, error, message} = this.state;
        const name = accountDisplayName(user) || 'Account';
        return (
            <div
                className={styles.root}
                ref={this.root}
            >
                <button
                    type="button"
                    className={styles.trigger}
                    ref={this.trigger}
                    aria-expanded={open}
                    aria-controls="account-panel"
                    onClick={() => (open ? this.close() : this.setState({open: true}))}
                >
                    <span aria-hidden="true">◉</span> {name} <span aria-hidden="true">▾</span>
                </button>
                {open && (
                    <section
                        className={styles.panel}
                        id="account-panel"
                        aria-label="Account"
                    >
                        <header className={styles.header}>
                            <strong>{titles[mode]}</strong>
                            <button
                                type="button"
                                aria-label="Close account"
                                disabled={busy}
                                onClick={() => this.close()}
                            >×</button>
                        </header>
                        {!this.service ? (
                            <p>Accounts are not configured yet. Follow the local setup in docs/accounts.md.</p>
                        ) : loading ? <p role="status">Checking your session…</p> : (
                            <React.Fragment>
                                {user && <p className={styles.identity}>{user.email}</p>}
                                <nav
                                    className={styles.navigation}
                                    aria-label="Account options"
                                >
                                    {(user ? ['profile', 'email', 'password'] : ['signin', 'signup', 'reset', 'resend']).map(item => (
                                        <button
                                            type="button"
                                            key={item}
                                            disabled={busy || (recovery && item !== 'password')}
                                            aria-pressed={mode === item}
                                            onClick={() => this.navigate(item)}
                                        >
                                            {{signin: 'Sign in',
                                                signup: 'Sign up',
                                                reset: 'Forgot password?',
                                                resend: 'Resend verification',
                                                profile: 'Profile',
                                                email: 'Email',
                                                password: 'Password'}[item]}
                                        </button>
                                    ))}
                                </nav>
                                {error && <p
                                    className={styles.error}
                                    role="alert"
                                >{error}</p>}
                                {message && <p
                                    className={styles.message}
                                    role="status"
                                >{message}</p>}
                                <form onSubmit={this.submit}>
                                    <fieldset
                                        disabled={busy}
                                        className={styles.fields}
                                    >
                                        {(mode === 'signup' || mode === 'profile') && this.field('name', 'Display name', 'text', 'nickname')}
                                        {['signin', 'signup', 'reset', 'resend', 'email'].includes(mode) && this.field('email', mode === 'email' ? 'New email' : 'Email', 'email', 'email')}
                                        {(mode === 'email' || (mode === 'password' && !recovery)) && this.field('currentPassword', 'Current password', 'password', 'current-password')}
                                        {['signin', 'signup', 'password'].includes(mode) && this.field('password', mode === 'password' ? 'New password' : 'Password', 'password', mode === 'signin' ? 'current-password' : 'new-password')}
                                        {(mode === 'signup' || mode === 'password') && (
                                            <React.Fragment>
                                                <small>Use at least 12 characters. A long, unique passphrase works well.</small>
                                                {this.field('confirmation', 'Confirm password', 'password', 'new-password')}
                                            </React.Fragment>
                                        )}
                                        <button
                                            className={styles.primary}
                                            type="submit"
                                            disabled={busy}
                                        >
                                            {busy ? 'Please wait…' : {signin: 'Sign in',
                                                signup: 'Create account',
                                                reset: 'Send reset link',
                                                resend: 'Send verification email',
                                                profile: 'Save profile',
                                                email: 'Update email',
                                                password: 'Update password'}[mode]}
                                        </button>
                                    </fieldset>
                                </form>
                                {user && (
                                    <div className={styles.signout}>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => this.signOut(false)}
                                        >Sign out</button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => this.signOut(true)}
                                        >Sign out all devices</button>
                                    </div>
                                )}
                                <p className={styles.note}>Check the editor’s save status before leaving. You can also save a copy to your computer.</p>
                            </React.Fragment>
                        )}
                    </section>
                )}
            </div>
        );
    }
}

export default AccountMenu;
