import { describe, it, expect } from 'vitest';
import { authErrorMessage } from '../lib/authErrors.js';

describe('authErrorMessage', () => {
  it('mapează credențiale, email existent și username luat', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toMatch(/parolă greșită/i);
    expect(authErrorMessage({ message: 'User already registered' })).toMatch(/deja un cont/i);
    expect(authErrorMessage({ code: '23505', message: 'duplicate key' })).toMatch(/deja luat/i);
    expect(authErrorMessage({ message: 'email rate limit exceeded' })).toMatch(/Prea multe încercări/);
  });

  it('păstrează un fallback', () => {
    expect(authErrorMessage({ message: 'Something exotic' })).toBe('Something exotic');
    expect(authErrorMessage(null)).toMatch(/eroare/i);
  });
});
