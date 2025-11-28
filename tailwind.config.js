module.exports = {
    content: [
      "./pages/**/*.{html,js}",
      "./index.html",
      "./components/**/*.{html,js}",
      "./src/**/*.{html,js}"
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            50: "#FFF4F0", // orange-50
            100: "#FFE4D6", // orange-100
            200: "#FFCAB0", // orange-200
            300: "#FFB08A", // orange-300
            400: "#FF8B5F", // orange-400
            500: "#FF6B35", // orange-500
            600: "#E55A2B", // orange-600
            700: "#CC4A21", // orange-700
            800: "#B23A17", // orange-800
            900: "#992A0D", // orange-900
            DEFAULT: "#FF6B35", // orange-500
          },
          secondary: {
            50: "#F0F8FF", // blue-50
            100: "#E0F0FF", // blue-100
            200: "#C1E1FF", // blue-200
            300: "#A2D2FF", // blue-300
            400: "#83C3FF", // blue-400
            500: "#64B4FF", // blue-500
            600: "#2E86AB", // blue-600
            700: "#256B87", // blue-700
            800: "#1C5063", // blue-800
            900: "#13353F", // blue-900
            DEFAULT: "#2E86AB", // blue-600
          },
          accent: {
            50: "#FFFBF0", // amber-50
            100: "#FFF5D6", // amber-100
            200: "#FFEBAD", // amber-200
            300: "#FFE184", // amber-300
            400: "#FFD75B", // amber-400
            500: "#F7931E", // amber-500
            600: "#DE7F1A", // amber-600
            700: "#C56B16", // amber-700
            800: "#AC5712", // amber-800
            900: "#93430E", // amber-900
            DEFAULT: "#F7931E", // amber-500
          },
          background: "#FAFAFA", // gray-50
          surface: "#FFFFFF", // white
          text: {
            primary: "#2D3748", // gray-800
            secondary: "#718096", // gray-500
          },
          success: {
            50: "#F0FFF4", // green-50
            100: "#C6F6D5", // green-100
            500: "#48BB78", // green-500
            600: "#38A169", // green-600
            DEFAULT: "#38A169", // green-600
          },
          warning: {
            50: "#FFFFF0", // yellow-50
            100: "#FEFCBF", // yellow-100
            500: "#ECC94B", // yellow-500
            600: "#D69E2E", // yellow-600
            DEFAULT: "#D69E2E", // yellow-600
          },
          error: {
            50: "#FED7D7", // red-50
            100: "#FEB2B2", // red-100
            500: "#F56565", // red-500
            600: "#E53E3E", // red-600
            DEFAULT: "#E53E3E", // red-600
          },
          border: {
            DEFAULT: "rgba(226, 232, 240, 0.8)", // gray-200 with opacity
            light: "rgba(247, 250, 252, 0.8)", // gray-100 with opacity
          },
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
          inter: ['Inter', 'sans-serif'],
          mono: ['JetBrains Mono', 'monospace'],
          data: ['JetBrains Mono', 'monospace'],
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
        boxShadow: {
          'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          'soft': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        },
        borderRadius: {
          'sm': '4px',
          'base': '8px',
          'lg': '12px',
          'xl': '16px',
        },
        transitionDuration: {
          'fast': '150ms',
          'base': '300ms',
        },
        transitionTimingFunction: {
          'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
        scale: {
          '102': '1.02',
        },
        animation: {
          'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'rotate': 'rotate 2s linear infinite',
          'toast-in': 'toast-in 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        keyframes: {
          'toast-in': {
            '0%': { transform: 'translateY(-100%)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          'rotate': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        },
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
        },
      },
    },
    plugins: [],
  }