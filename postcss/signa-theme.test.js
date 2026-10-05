import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import signaTheme, { darkenValue, darkSelector, scaleValue } from './signa-theme.js';

const run = async (css) => (await postcss([signaTheme()]).process(css, { from: undefined })).css;

describe('signa-theme — tema întunecată', () => {
  it('inversează suprafețele deschise și păstrează opacitatea Tailwind', () => {
    expect(darkenValue('rgb(255 255 255 / var(--tw-bg-opacity))', 'background-color'))
      .toBe('rgb(34 31 27 / var(--tw-bg-opacity))');
    expect(darkenValue('#FBF7F0', 'background-color')).toBe('#2a2620');
  });

  it('păstrează sintaxa cu spații când alfa e `var()` cu fallback', () => {
    expect(darkenValue('rgb(255 251 243 / var(--tw-bg-opacity, 1))', 'background-color'))
      .toBe('rgb(23 21 18 / var(--tw-bg-opacity, 1))');
    expect(darkenValue('rgba(46,42,36,.06)', 'border-color')).toBe('rgba(243, 238, 230,.06)');
  });

  it('textul închis devine deschis, dar albul de pe butoane rămâne alb', () => {
    expect(darkenValue('rgb(46 42 36 / var(--tw-text-opacity))', 'color'))
      .toBe('rgb(243 238 230 / var(--tw-text-opacity))');
    expect(darkenValue('rgb(255 255 255 / var(--tw-text-opacity))', 'color')).toBeNull();
  });

  it('albul translucid de pe bannere nu se atinge', () => {
    expect(darkenValue('rgb(255 255 255 / 0.14)', 'background-color')).toBeNull();
  });

  it('ink plin ca fundal devine gri cald, ink translucid devine tentă deschisă', () => {
    expect(darkenValue('rgb(46 42 36 / var(--tw-bg-opacity))', 'background-color'))
      .toBe('rgb(74 68 59 / var(--tw-bg-opacity))');
    expect(darkenValue('rgb(46 42 36 / 0.06)', 'border-color')).toBe('rgb(243 238 230 / 0.06)');
  });

  it('înlocuiește în gradienți arbitrari', () => {
    expect(darkenValue('linear-gradient(135deg,#ecfdf5,#fff7e8)', 'background-image'))
      .toBe('linear-gradient(135deg,#173828,#2a2219)');
  });

  it('nu atinge umbrele și keyframe-urile', async () => {
    const css = await run(`
      .a { box-shadow: 0 2px 4px rgba(46,42,36,.05); }
      @keyframes k { 0% { background-color: #fff; } }
    `);
    expect(css).not.toContain('data-theme');
  });

  it('adaugă regula întunecată imediat după cea originală, cu specificitate zero în plus', async () => {
    const css = await run('.bg-white { background-color: #fff; } .hover\\:x:hover { color: red; }');
    expect(css.indexOf(':where([data-theme="dark"]) .bg-white'))
      .toBeLessThan(css.indexOf('.hover\\:x'));
  });

  it('selectori html / :root primesc atributul direct', () => {
    expect(darkSelector('html')).toBe('html[data-theme="dark"]');
    expect(darkSelector(':root')).toBe(':root[data-theme="dark"]');
    expect(darkSelector('.p > .c')).toBe(':where([data-theme="dark"]) .p > .c');
  });
});

describe('signa-theme — mărimea textului', () => {
  it('scalează px/rem și lasă în pace valorile relative', () => {
    expect(scaleValue('15px')).toBe('calc(15px * var(--sg-text-scale, 1))');
    expect(scaleValue('0.875rem')).toBe('calc(0.875rem * var(--sg-text-scale, 1))');
    expect(scaleValue('1.5')).toBeNull();
    expect(scaleValue('inherit')).toBeNull();
    expect(scaleValue('100%')).toBeNull();
  });

  it('se aplică pe font-size și line-height în CSS-ul generat', async () => {
    const css = await run('.text-sm { font-size: 0.875rem; line-height: 1.25rem; }');
    expect(css).toContain('font-size: calc(0.875rem * var(--sg-text-scale, 1))');
    expect(css).toContain('line-height: calc(1.25rem * var(--sg-text-scale, 1))');
  });
});
