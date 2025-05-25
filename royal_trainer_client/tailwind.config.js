/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'cr-blue': '#0072ce',
                'cr-gold': '#ffd700',
                'cr-brown': '#6b4924',
                'cr-navy': '#0b162d',
                'cr-purple': '#b154ff',
                'cr-purple-light': '#c47cff',
                'cr-orange': '#ff9500',
            },
            fontFamily: {
                'clash': ['Inter', 'Arial', 'sans-serif'],
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    'from': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)' },
                    'to': { boxShadow: '0 0 30px rgba(255, 215, 0, 0.8)' },
                }
            },
            backgroundImage: {
                'cr-gradient': 'linear-gradient(135deg, #0072ce 0%, #001f3f 100%)',
                'gold-gradient': 'linear-gradient(135deg, #ffd700, #ffb300)',
                'purple-gradient': 'linear-gradient(135deg, #b154ff, #8e44ad)',
                'red-gradient': 'linear-gradient(135deg, #ff0000, #cc0000)',
            },
            backdropBlur: {
                'xs': '2px',
            }
        },
    },
    plugins: [],
}