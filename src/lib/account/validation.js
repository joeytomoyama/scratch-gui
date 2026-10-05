/* eslint-disable max-len */
// Metadata is user-editable through Auth APIs, including its JSON type.
export const accountDisplayName = user => {
    const name = user && user.user_metadata && user.user_metadata.display_name;
    return typeof name === 'string' ? name.trim().slice(0, 60) : '';
};

export const validateEmail = value => {
    const email = value.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Enter a valid email address.');
    }
    return email;
};

export const validatePassword = value => {
    // bcrypt uses at most 72 bytes, not 72 characters.
    if (value.length < 12 || new TextEncoder().encode(value).length > 72) {
        throw new Error('Use a password of at least 12 characters and no more than 72 bytes.');
    }
    return value;
};

export const validateName = value => {
    const name = value.trim();
    if (!name || name.length > 60) throw new Error('Enter a display name of 1–60 characters.');
    return name;
};

export const publicAuthError = error => {
    const code = error && error.code;
    if (code === 'invalid_credentials') return 'Email or password is incorrect.';
    if (code === 'email_not_confirmed') return 'Verify your email before signing in. You can resend the verification email.';
    if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || (error && error.status === 429)) {
        return 'Too many attempts. Please wait before trying again.';
    }
    if (code === 'weak_password') return 'Choose a stronger password with at least 12 characters.';
    if (code === 'same_password') return 'Choose a different password.';
    if (code === 'reauthentication_needed') return 'Sign out and sign in again before changing your password.';
    if (code === 'reauthentication_not_valid' || code === 'invalid_current_password') return 'Your current password is incorrect.';
    if (error && error.name === 'AuthRetryableFetchError') return 'Cannot reach the account service. Please try again.';
    return 'The account request could not be completed. Try again or request a new email link.';
};
