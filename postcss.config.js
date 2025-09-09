/**
 * PostCSS Configuration
 * Handles Tailwind CSS and other CSS processing
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  plugins: [
    // Tailwind CSS
    require('tailwindcss')('./tailwind.config.js'),
    
    // Autoprefixer for browser compatibility
    require('autoprefixer')({
      overrideBrowserslist: [
        'last 2 Chrome versions',
        'last 2 Firefox versions',
        'last 2 Safari versions',
        'last 2 Edge versions'
      ],
      grid: 'autoplace',
      flexbox: 'no-2009'
    }),
    
    // Production-only plugins
    ...(!isDevelopment ? [
      // CSS optimization
      require('cssnano')({
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: { exclude: false }
        }]
      })
    ] : [])
  ]
};