import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  CONVERSION_TTL_MS, GUEST_PROGRESS_KEY,
  consumeGuestConversion, enterGuest, exitGuest, isGuestSession, touchGuestConversion,
} from './guest.js';

const memory = new Map();

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  memory.clear();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  };
});

describe('modul invitat', () => {
  it('pornește oprit', () => {
    expect(isGuestSession()).toBe(false);
    expect(consumeGuestConversion()).toBe(false);
  });

  it('ieșirea din modul invitat nu anulează conversia', () => {
    enterGuest();
    exitGuest();
    expect(isGuestSession()).toBe(false);
    // Progresul strâns ca invitat tot trebuie mutat pe primul cont care apare.
    expect(consumeGuestConversion()).toBe(true);
  });

  it('conversia se consumă o singură dată', () => {
    enterGuest();
    expect(consumeGuestConversion()).toBe(true);
    expect(consumeGuestConversion()).toBe(false);
  });

  it('supraviețuiește unui refresh', () => {
    enterGuest();
    expect(isGuestSession()).toBe(true);
  });

  // Regresie: `INITIAL_SESSION` se emite și fără sesiune, la fiecare încărcare
  // de pagină. Dacă handler-ul de progres nu cere `session?.user`, un refresh
  // în modul invitat consuma conversia, stingea flag-ul și ștergea slate-ul.
  it('un slate uitat de luni de zile nu mai e revendicat, și se șterge', () => {
    enterGuest();
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ xp: 200 }));

    vi.setSystemTime(Date.now() + CONVERSION_TTL_MS + 1000);

    expect(consumeGuestConversion()).toBe(false);
    expect(localStorage.getItem(GUEST_PROGRESS_KEY)).toBe(null);
  });

  it('fereastra măsoară inactivitate: un invitat care învață nu pierde nimic', () => {
    enterGuest();
    // Patru zile mai târziu mai face o lecție — scrierea reîmprospătează dreptul.
    vi.setSystemTime(Date.now() + CONVERSION_TTL_MS - 1000);
    touchGuestConversion();
    vi.setSystemTime(Date.now() + CONVERSION_TTL_MS - 1000);

    expect(consumeGuestConversion()).toBe(true);
  });

  it('un refresh fără sesiune nu consumă conversia', () => {
    enterGuest();
    const reloadFaraSesiune = () => isGuestSession();
    reloadFaraSesiune();
    reloadFaraSesiune();
    expect(isGuestSession()).toBe(true);
    expect(consumeGuestConversion()).toBe(true);
  });
});
