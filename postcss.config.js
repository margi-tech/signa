import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import signaTheme from './postcss/signa-theme.js';

export default {
  plugins: [
    tailwindcss,
    // După Tailwind: vede toate clasele generate (inclusiv cele arbitrare).
    signaTheme(),
    autoprefixer,
  ],
};
