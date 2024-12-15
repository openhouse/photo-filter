/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.hbs',
    './app/**/*.js',
    './app/**/*.ts',
    './app/**/*.gjs',
    './app/**/*.gts',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
};
