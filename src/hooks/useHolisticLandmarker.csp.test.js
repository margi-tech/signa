import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FACE_MODEL_PATH,
  HAND_MODEL_PATH,
  POSE_MODEL_PATH,
  WASM_PATH,
} from './useHolisticLandmarker.js';

function cspTokens(directive) {
  const vercel = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));
  const csp = vercel.headers
    .flatMap((block) => block.headers)
    .find((header) => header.key === 'Content-Security-Policy')
    ?.value;
  if (!csp) throw new Error('vercel.json nu are Content-Security-Policy');

  const line = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${directive} `));
  if (!line) throw new Error(`CSP nu are directiva ${directive}`);
  return line.split(/\s+/).slice(1);
}

describe('CSP MediaPipe pe Vercel', () => {
  it('permite scriptul WASM de pe jsDelivr, nu doar fetch', () => {
    const scriptSrc = cspTokens('script-src');
    expect(scriptSrc).toContain(new URL(WASM_PATH).origin);
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");
  });

  it('permite descărcarea WASM-ului și a modelelor .task', () => {
    const connectSrc = cspTokens('connect-src');
    const modelOrigins = [HAND_MODEL_PATH, FACE_MODEL_PATH, POSE_MODEL_PATH].map(
      (path) => new URL(path).origin,
    );

    expect(connectSrc).toContain(new URL(WASM_PATH).origin);
    expect(connectSrc).toEqual(expect.arrayContaining(modelOrigins));
  });
});
