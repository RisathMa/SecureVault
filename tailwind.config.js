/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    900: '#0f172a',
                    800: '#1e293b',
                    700: '#334155',
                    600: '#475569',
                    500: '#10b981', // Emerald for security
                    400: '#34d399',
                }
            }
        },
    },
    plugins: [],
}
