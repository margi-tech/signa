import { describe, it, expect } from 'vitest';
import { validateUsername, validatePassword, validateName, validateEmail } from './username.js';

describe('validateUsername', () => {
  it('acceptă 3–20 caractere alfanumerice, punct și underscore', () => {
    expect(validateUsername('ana')).toBeNull();
    expect(validateUsername('Ana_99.test')).toBeNull();
    expect(validateUsername('abcdefghijabcdefghij')).toBeNull();
  });

  it('respinge prea scurt, prea lung, spații și caractere ilegale', () => {
    expect(validateUsername('ab')).toMatch(/minim 3/);
    expect(validateUsername('abcdefghijabcdefghija')).toMatch(/maxim 20/);
    expect(validateUsername('ana pop')).toMatch(/spații/);
    expect(validateUsername('ana@home')).toMatch(/litere, cifre/);
    expect(validateUsername('  ')).toMatch(/minim 3/);
  });
});

describe('validatePassword', () => {
  it('cere minim 8 caractere', () => {
    expect(validatePassword('short')).toMatch(/minim 8/);
    expect(validatePassword('abcdefgh')).toBeNull();
  });
});

describe('validateEmail', () => {
  it('acceptă adrese uzuale', () => {
    expect(validateEmail('testul123@gmail.com')).toBeNull();
    expect(validateEmail('david.m@signa.ro')).toBeNull();
  });

  it('respinge gol, spații, fără @, fără domeniu', () => {
    expect(validateEmail('')).toMatch(/obligatoriu/);
    expect(validateEmail('a b@gmail.com')).toMatch(/spații/);
    expect(validateEmail('davidgmail.com')).toMatch(/nume@domeniu/);
    expect(validateEmail('david@gmail')).toMatch(/nume@domeniu/);
    expect(validateEmail('david@@gmail.com')).toMatch(/nume@domeniu/);
    expect(validateEmail('david@gmail..com')).toMatch(/puncte consecutive/);
  });
});
