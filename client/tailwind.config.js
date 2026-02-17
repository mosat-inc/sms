/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  // Keep Tailwind from changing the global look-and-feel of the existing app.
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

