import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { removeAvatarFiles } from './supabase.js';

function fakeBucket(names, { listError = null, removeError = null } = {}) {
  return {
    list: vi.fn(async () => ({ data: names.map((name) => ({ name })), error: listError })),
    remove: vi.fn(async () => ({ data: [], error: removeError })),
  };
}

describe('removeAvatarFiles', () => {
  it('șterge prin Storage API toate fișierele din folderul userului', async () => {
    const bucket = fakeBucket(['avatar.jpg', 'avatar.png']);
    await expect(removeAvatarFiles(bucket, 'u1')).resolves.toBe(2);
    expect(bucket.list).toHaveBeenCalledWith('u1');
    expect(bucket.remove).toHaveBeenCalledWith(['u1/avatar.jpg', 'u1/avatar.png']);
  });

  it('nu cheamă remove când userul n-are poză', async () => {
    const bucket = fakeBucket([]);
    await expect(removeAvatarFiles(bucket, 'u1')).resolves.toBe(0);
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('aruncă dacă ștergerea pică — contul nu se șterge cu poza rămasă', async () => {
    const bucket = fakeBucket(['avatar.jpg'], { removeError: new Error('denied') });
    await expect(removeAvatarFiles(bucket, 'u1')).rejects.toThrow('denied');
  });
});

describe('SQL-ul din supabase/', () => {
  // Supabase blochează `delete from storage.objects` (storage.protect_delete):
  // un astfel de delete face să pice tot scriptul sau funcția în care stă.
  it('nu șterge direct din storage.objects', () => {
    const dir = new URL('../../supabase/', import.meta.url);
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .filter((f) => {
        // Comentariile care explică interdicția nu contează — doar codul SQL.
        const sql = readFileSync(new URL(f, dir), 'utf8').replace(/--.*$/gm, '');
        return /delete\s+from\s+storage\.objects/i.test(sql);
      });
    expect(offenders).toEqual([]);
  });
});
