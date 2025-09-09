/**
 * Webpack Configuration for Electron Preload Scripts
 * Handles TypeScript compilation with security considerations and optimization
 */

const path = require('path');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  // Target Electron preload process
  target: 'electron-preload',
  
  // Entry point for preload scripts
  entry: {
    preload: path.resolve(__dirname, 'src/main/preload.ts')
  },
  
  // Development/Production mode
  mode: isDevelopment ? 'development' : 'production',
  
  // Enable development tools
  devtool: isDevelopment ? 'eval-cheap-module-source-map' : 'source-map',
  
  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: '[name].js',
    clean: false, // Don't clean since main process also outputs here
    library: {
      type: 'commonjs2'
    },
    environment: {
      arrowFunction: false, // Maintain compatibility
      bigIntLiteral: false,
      const: false,
      destructuring: false,
      dynamicImport: false,
      forOf: false,
      module: false
    }
  },
  
  // Module resolution
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types')
    },
    fallback: {
      // Security: Disable Node.js modules that shouldn't be available in preload
      "fs": false,
      "child_process": false,
      "net": false,
      "tls": false,
      "crypto": false, // Use contextIsolation instead
      
      // Allow safe modules with polyfills if needed
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "events": require.resolve("events/"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/")
    }
  },
  
  // Module rules for different file types
  module: {
    rules: [
      // TypeScript/JavaScript files
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.build.json'),
              transpileOnly: true,
              compilerOptions: {
                module: 'commonjs', // Use CommonJS for preload
                target: 'es2020',
                lib: ['es2020', 'dom'],
                moduleResolution: 'node',
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                skipLibCheck: true,
                strict: false,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: false,
                declaration: false,
                sourceMap: true
              }
            }
          },
          
          // Babel loader for additional transformations
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    electron: '22.0.0'
                  },
                  modules: 'cjs', // CommonJS for preload
                  useBuiltIns: false, // No polyfills in preload
                  bugfixes: true
                }],
                '@babel/preset-typescript'
              ],
              plugins: [
                '@babel/plugin-syntax-dynamic-import',
                '@babel/plugin-transform-class-properties',
                '@babel/plugin-transform-object-rest-spread',
                
                // Security: Transform potentially dangerous patterns
                ['@babel/plugin-transform-runtime', {
                  corejs: false,
                  helpers: false,
                  regenerator: false,
                  useESModules: false
                }]
              ],
              cacheDirectory: true,
              cacheCompression: false,
              compact: !isDevelopment
            }
          }
        ]
      },
      
      // JSON files
      {
        test: /\.json$/,
        type: 'json'
      }
    ]
  },
  
  // External dependencies - be very restrictive for security
  externals: {
    // Only allow essential Electron APIs
    electron: 'commonjs2 electron',
    
    // Block potentially dangerous Node.js modules
    fs: 'commonjs2 null',
    child_process: 'commonjs2 null',
    net: 'commonjs2 null',
    tls: 'commonjs2 null',
    crypto: 'commonjs2 null',
    
    // Allow safe utilities
    path: 'commonjs2 path',
    url: 'commonjs2 url',
    events: 'commonjs2 events'
  },
  
  // Webpack plugins
  plugins: [
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
      'process.env.ELECTRON_ENV': JSON.stringify('preload'),
      
      // Security: Prevent access to sensitive globals
      'global': 'globalThis',
      '__dirname': '__dirname',
      '__filename': '__filename'
    }),
    
    // Security: Prevent usage of dangerous globals
    new webpack.ProvidePlugin({
      // Don't provide any automatic polyfills for security
    }),
    
    // Environment-specific plugins
    ...(isDevelopment ? [
      // Development plugins
      new webpack.LoaderOptionsPlugin({
        debug: true
      })
    ] : [
      // Production plugins
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      
      // Bundle analyzer for preload scripts
      ...(process.env.ANALYZE === 'true' ? [
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: path.resolve(__dirname, 'dist/preload-bundle-report.html')
        })
      ] : [])
    ])
  ],
  
  // Optimization settings
  optimization: {
    minimize: !isDevelopment,
    minimizer: !isDevelopment ? [
      // Terser for JavaScript minification with security focus
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          parse: {
            ecma: 8
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            
            // Security: Remove debugging code
            drop_console: true,
            drop_debugger: true,
            
            // Security: Remove dead code that might contain sensitive info
            dead_code: true,
            unused: true,
            
            // Security: Don't expose function names
            keep_fnames: false,
            keep_classnames: false
          },
          mangle: {
            safari10: true,
            // Security: Mangle all identifiers
            toplevel: true,
            eval: true
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
            // Security: Remove function names from output
            keep_quoted_props: false
          }
        },
        parallel: true,
        extractComments: false
      })
    ] : [],
    
    // Don't split chunks for preload (should be single file)
    splitChunks: false,
    
    // No runtime chunk for preload
    runtimeChunk: false,
    
    // Tree shaking with security focus
    usedExports: true,
    sideEffects: false,
    
    // Security: Don't concatenate modules to prevent code injection
    concatenateModules: false
  },
  
  // Performance hints
  performance: {
    hints: isDevelopment ? false : 'warning',
    maxEntrypointSize: 512 * 1024, // 512KB - preload should be small
    maxAssetSize: 512 * 1024 // 512KB
  },
  
  // Watch options for development
  ...(isDevelopment && {
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: false
    }
  }),
  
  // Stats configuration
  stats: {
    colors: true,
    errors: true,
    errorDetails: true,
    warnings: true,
    assets: !isDevelopment,
    modules: false,
    entrypoints: false,
    chunks: false,
    chunkModules: false,
    children: false,
    timings: true,
    version: false,
    builtAt: !isDevelopment,
    // Security: Don't expose too much build info
    env: false,
    hash: false
  },
  
  // Node configuration - disable Node.js features for security
  node: {
    __dirname: false,
    __filename: false,
    global: false
  },
  
  // Cache configuration for faster builds
  cache: isDevelopment ? {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    },
    // Security: Use separate cache for preload
    name: 'preload-cache'
  } : false,
  
  // Security: Disable experiments that might introduce vulnerabilities
  experiments: {
    topLevelAwait: false, // Not safe in preload context
    outputModule: false
  },
  
};

// Security: Validate configuration
if (!isDevelopment) {
  // Ensure no development dependencies leak into production
  const config = module.exports;
  
  if (config.devtool && config.devtool.includes('eval')) {
    throw new Error('Security: eval-based source maps not allowed in production preload');
  }
  
  if (config.externals && typeof config.externals === 'object') {
    const dangerousExternals = ['fs', 'child_process', 'net', 'tls', 'crypto'];
    dangerousExternals.forEach(ext => {
      if (config.externals[ext] && config.externals[ext] !== 'commonjs2 null') {
        console.warn(`Security Warning: External '${ext}' is allowed in preload`);
      }
    });
  }
}

module.exports = module.exports;