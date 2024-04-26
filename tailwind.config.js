import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('progress-unfilled', [
        '&::-webkit-progress-bar',
        '&::-moz-progress-bar',
        '&',
      ]);
      addVariant('progress-filled', ['&::-webkit-progress-value', '&']);
    }),
  ],
};
