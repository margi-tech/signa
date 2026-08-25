import { describe, expect, it } from 'vitest';
import { hasValidImageSignature } from './supabase.js';

function fileOf(bytes, type) {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  return Object.assign(blob, { name: 'avatar' });
}

describe('hasValidImageSignature', () => {
  it('acceptă semnătura PNG reală', async () => {
    const png = fileOf(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
      'image/png',
    );
    await expect(hasValidImageSignature(png)).resolves.toBe(true);
  });

  it('respinge un SVG deghizat ca JPEG', async () => {
    const disguised = new Blob(['<svg><script>alert(1)</script></svg>'], {
      type: 'image/jpeg',
    });
    await expect(hasValidImageSignature(disguised)).resolves.toBe(false);
  });
});
