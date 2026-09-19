import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { LESSONS, lessonResult } from './lessons.js';

/**
 * Contractul dintre client și `record_lesson_completion`: RPC-ul refuză cu
 * `Invalid lesson reward` orice lecție necunoscută sau XP peste plafon, iar
 * evenimentul respins rămâne blocat în coada locală, reîncercat la fiecare
 * flush. Testul prinde din vreme derapajul, fără să atingă baza live —
 * altfel s-ar vedea abia la prima conversie a unui invitat.
 */
const schemaSql = readFileSync(
  fileURLToPath(new URL('../../supabase/schema.sql', import.meta.url)),
  'utf8',
);

const serverAllowlist = Object.fromEntries(
  [...schemaSql.matchAll(/when '([^']+)' then (\d+)/g)].map(([, id, xp]) => [id, Number(xp)]),
);

describe('plafoanele XP din schema.sql', () => {
  it('acoperă fiecare lecție din curriculum', () => {
    const lipsa = LESSONS.map((l) => String(l.id)).filter((id) => !(id in serverAllowlist));
    expect(lipsa).toEqual([]);
  });

  it('se potrivesc exact cu recompensa pentru o lecție perfectă', () => {
    const derapaje = LESSONS
      .map((l) => ({
        id: String(l.id),
        client: lessonResult(l.letters.length, 0).xp,
        server: serverAllowlist[String(l.id)],
      }))
      .filter((r) => r.client !== r.server);
    expect(derapaje).toEqual([]);
  });

  it('acceptă repetițiile, pe care le trimite conversia de invitat', () => {
    expect(serverAllowlist.review).toBe(90);
  });
});
