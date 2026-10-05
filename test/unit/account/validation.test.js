import {validatePassword, validateEmail, validateName, publicAuthError, accountDisplayName} from '../../../src/lib/account/validation';

test('validates email and trims whitespace', () => {
    expect(validateEmail(' student@example.com ')).toBe('student@example.com');
    expect(() => validateEmail('bad')).toThrow();
});
test('enforces minimum password and bcrypt byte limit without trimming passwords', () => {
    expect(() => validatePassword('short')).toThrow();
    expect(() => validatePassword('é'.repeat(37))).toThrow();
    expect(validatePassword(' a long passphrase ')).toBe(' a long passphrase ');
});
test('limits display name and maps auth failures without exposing raw errors', () => {
    expect(validateName(' Student ')).toBe('Student');
    expect(() => validateName('x'.repeat(61))).toThrow();
    expect(publicAuthError({code: 'invalid_credentials'})).toBe('Email or password is incorrect.');
    expect(publicAuthError({message: 'private token'})).not.toContain('private token');
    expect(publicAuthError({status: 429})).toContain('Too many');
});
test('malformed user metadata cannot become a React child or crash the menu', () => {
    expect(accountDisplayName(null)).toBe('');
    expect(accountDisplayName({})).toBe('');
    expect(accountDisplayName({user_metadata: {display_name: {bad: 'object'}}})).toBe('');
    expect(accountDisplayName({user_metadata: {display_name: ' Student '}})).toBe('Student');
    expect(accountDisplayName({user_metadata: {display_name: 'x'.repeat(100)}})).toHaveLength(60);
});
