export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
