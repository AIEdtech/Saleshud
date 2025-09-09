/**
 * Webpack Configuration for Electron Main Process
 * Handles TypeScript compilation, hot reload, and production optimization
 */

const path = require('path');
const webpack = require('webpack');

// Webpack --mode sets NODE_ENV, but check both explicitly
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  // Target Electron main process
  target: 'electron-main',
  
  // Entry point for main process
  entry: {
    main: path.resolve(__dirname, 'src/main/main.ts')
  },
  
  // Development/Production mode
  mode: isDevelopment ? 'development' : 'production',
  
  // Enable development tools
  devtool: isDevelopment ? 'eval-cheap-module-source-map' : 'source-map',
  
  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: '[name].js',
    clean: !isDevelopment, // Clean output directory in production
    library: {
      type: 'commonjs2'
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
      // Provide polyfills for Node.js modules if needed
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "events": require.resolve("events/")
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
              transpileOnly: true, // Faster builds in development
              compilerOptions: {
                module: 'es6',
                target: 'es2020',
                lib: ['es2020'],
                moduleResolution: 'node',
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                skipLibCheck: true,
                strict: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: false,
                declaration: false,
                sourceMap: true
              }
            }
          }
        ]
      },
      
      // JSON files
      {
        test: /\.json$/,
        type: 'json'
      },
      
      // Node native modules
      {
        test: /\.node$/,
        use: 'node-loader'
      },
      
      // Asset files (for resources that main process might need)
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico|icns)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[hash][ext]'
        }
      }
    ]
  },
  
  // External dependencies (don't bundle these)
  externals: {
    // Electron modules
    electron: 'commonjs2 electron',
    
    // Native Node.js modules
    fs: 'commonjs2 fs',
    path: 'commonjs2 path',
    os: 'commonjs2 os',
    crypto: 'commonjs2 crypto',
    events: 'commonjs2 events',
    stream: 'commonjs2 stream',
    util: 'commonjs2 util',
    url: 'commonjs2 url',
    assert: 'commonjs2 assert',
    
    // Keep node_modules external to avoid bundling issues
    ...(() => {
      const externals = {};
      const package = require('./package.json');
      
      // Add all dependencies as externals
      if (package.dependencies) {
        Object.keys(package.dependencies).forEach(dep => {
          externals[dep] = `commonjs2 ${dep}`;
        });
      }
      
      return externals;
    })()
  },
  
  // Webpack plugins
  plugins: [
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
      'process.env.ELECTRON_ENV': JSON.stringify('main'),
      '__dirname': '__dirname',
      '__filename': '__filename'
    }),
    
    // Environment-specific plugins
    ...(isDevelopment ? [
      // Development plugins
      new webpack.HotModuleReplacementPlugin(),
      
      // Better error messages
      new webpack.LoaderOptionsPlugin({
        debug: true
      })
    ] : [
      // Production plugins
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      
      // Bundle analyzer (optional)
      ...(process.env.ANALYZE === 'true' ? [
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: path.resolve(__dirname, 'dist/main-bundle-report.html')
        })
      ] : [])
    ])
  ],
  
  // Optimization settings
  optimization: {
    minimize: !isDevelopment,
    minimizer: !isDevelopment ? [
      // Terser for JavaScript minification
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
            drop_console: true, // Remove console.log in production
            drop_debugger: true
          },
          mangle: {
            safari10: true
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true
          }
        },
        parallel: true,
        extractComments: false
      })
    ] : [],
    
    // Split chunks configuration
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all'
        }
      }
    },
    
    // Runtime chunk
    runtimeChunk: false,
    
    // Tree shaking
    usedExports: true,
    sideEffects: false
  },
  
  // Performance hints
  performance: {
    hints: isDevelopment ? false : 'warning',
    maxEntrypointSize: isDevelopment ? Infinity : 1024 * 1024, // 1MB
    maxAssetSize: isDevelopment ? Infinity : 1024 * 1024 // 1MB
  },
  
  // Development server configuration
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
    builtAt: !isDevelopment
  },
  
  // Node configuration for Electron main process
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
    }
  } : false,
  
  // Experiments (for future webpack features)
  experiments: {
    topLevelAwait: true
  }
};