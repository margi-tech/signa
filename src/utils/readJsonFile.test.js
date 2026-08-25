import { describe, expect, it, vi } from 'vitest';
import { readJsonObject } from './readJsonFile.js';

describe('readJsonObject', () => {
  it('refuză fișierele peste limită înainte să le citească', async () => {
    const text = vi.fn();
    const file = { size: 11, text };

    await expect(readJsonObject(file, 10)).rejects.toThrow('Limita');
    expect(text).not.toHaveBeenCalled();
  });

  it('acceptă doar un obiect JSON la rădăcină', async () => {
    const file = { size: 2, text: async () => '[]' };
    await expect(readJsonObject(file, 10)).rejects.toThrow('obiect cu etichete');
  });

  it('citește un obiect valid', async () => {
    const file = { size: 9, text: async () => '{"A":[]}' };
    await expect(readJsonObject(file, 20)).resolves.toEqual({ A: [] });
  });
});
