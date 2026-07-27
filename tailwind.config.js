/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Signa: verde smarald pentru vizualizarea mâinii
        signa: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          900: '#064e3b',
        },
        // Fundal cald, prietenos — înlocuiește dark theme-ul inițial
        cream: {
          DEFAULT: '#FFFBF3',
          50:  '#FFFEFC',
          100: '#FFF7E8',
          200: '#FFEFD1',
        },
        // Text/contur — cărbune cald, nu negru pur (mai blând pe fundal deschis)
        ink: {
          400: '#A69C8D',
          500: '#8A8071',
          600: '#6B6255',
          700: '#4F473C',
          900: '#2E2A24',
        },
      },
      boxShadow: {
        // Umbre calde, difuze — înlocuiesc glow-urile neon de pe dark theme
        soft:   '0 4px 20px rgba(46, 42, 36, 0.06)',
        card:   '0 2px 10px rgba(46, 42, 36, 0.05)',
        button: '0 8px 24px rgba(16, 185, 129, 0.22)',
      },
    },
  },
  plugins: [],
};
