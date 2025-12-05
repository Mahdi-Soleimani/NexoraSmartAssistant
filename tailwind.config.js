/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}", // اگر پوشه کامپوننت‌ها در روت است
    "./**/*.{js,ts,jsx,tsx}", // برای اطمینان تمام فایل‌ها را اسکن می‌کند
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}