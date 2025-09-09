/**
 * Tailwind CSS Configuration
 * Custom design system for SalesHud with glassmorphism theme
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,jsx,ts,tsx,html}',
    './src/renderer/index.html'
  ],
  
  darkMode: 'class',
  
  theme: {
    extend: {
      // Custom colors for SalesHud theme
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Main blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7', // Main purple
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87'
        },
        slate: {
          950: '#0a0f1c' // Extra dark for backgrounds
        }
      },
      
      // Custom fonts
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace']
      },
      
      // Custom spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      
      // Custom border radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      
      // Custom shadows for glassmorphism
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glass-xl': '0 35px 60px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'neural': '0 0 40px rgba(99, 102, 241, 0.1), 0 0 80px rgba(99, 102, 241, 0.05)'
      },
      
      // Custom backdrop blur
      backdropBlur: {
        xs: '2px',
        '4xl': '72px'
      },
      
      // Custom gradients
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'neural-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'mesh-gradient': 'radial-gradient(circle at 25% 25%, #667eea 0%, transparent 50%), radial-gradient(circle at 75% 75%, #764ba2 0%, transparent 50%)',
        'aurora': 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)'
      },
      
      // Custom animations
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'neural-pulse': 'neuralPulse 4s ease-in-out infinite'
      },
      
      // Custom keyframes
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeInUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        slideInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        scaleIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        pulseSoft: {
          '0%, 100%': {
            opacity: '1'
          },
          '50%': {
            opacity: '0.7'
          }
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)'
          },
          '50%': {
            transform: 'translateY(-10px)'
          }
        },
        glow: {
          '0%': {
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
          },
          '100%': {
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.6)'
          }
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-200% 0'
          },
          '100%': {
            backgroundPosition: '200% 0'
          }
        },
        neuralPulse: {
          '0%, 100%': {
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)',
            transform: 'scale(1)'
          },
          '50%': {
            boxShadow: '0 0 60px rgba(99, 102, 241, 0.2)',
            transform: 'scale(1.02)'
          }
        }
      },
      
      // Typography enhancements
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }]
      },
      
      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    }
  },
  
  plugins: [
    // Custom plugin for glassmorphism utilities
    function({ addUtilities, addComponents }) {
      // Glassmorphism utilities
      const glassUtilities = {
        '.glass': {
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(71, 85, 105, 0.5)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        },
        '.glass-light': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        },
        '.glass-intense': {
          background: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(71, 85, 105, 0.7)'
        }
      };
      
      // Button components
      const buttonComponents = {
        '.btn-glass': {
          '@apply glass px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white/10': {}
        },
        '.btn-primary': {
          '@apply bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:from-primary-700 hover:to-primary-800 shadow-lg': {}
        }
      };
      
      // Card components
      const cardComponents = {
        '.card-glass': {
          '@apply glass rounded-xl p-6': {}
        },
        '.card-hover': {
          '@apply transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-glass-lg': {}
        }
      };
      
      // Scrollbar utilities
      const scrollbarUtilities = {
        '.scrollbar-thin': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px'
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(30, 41, 59, 0.3)',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(71, 85, 105, 0.7)',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(71, 85, 105, 0.9)'
          }
        }
      };
      
      addUtilities(glassUtilities);
      addUtilities(scrollbarUtilities);
      addComponents(buttonComponents);
      addComponents(cardComponents);
    }
  ]
};