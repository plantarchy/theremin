/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html",
    "./index.css",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      'body': ['"Arial"'],
    },
    extend: {},
  },
  plugins: [],
}

