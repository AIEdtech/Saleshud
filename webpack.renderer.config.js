/**
 * Webpack Configuration for Electron Renderer Process (React)
 * Handles React/TypeScript compilation, Tailwind CSS, HMR, and production optimization
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
// const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
// const ESLintPlugin = require('eslint-webpack-plugin');

const isDevelopment = process.env.NODE_ENV === 'development';
const isAnalyze = process.env.ANALYZE === 'true';

module.exports = {
  // Target Electron renderer process
  target: 'electron-renderer',
  
  // Entry points for renderer process
  entry: {
    renderer: [
      // Hot reload support
      ...(isDevelopment ? ['webpack-hot-middleware/client'] : []),
      // Main entry
      path.resolve(__dirname, 'src/renderer/index.tsx')
    ],
    overlay: [
      // Hot reload support
      ...(isDevelopment ? ['webpack-hot-middleware/client'] : []),
      // Overlay entry
      path.resolve(__dirname, 'src/renderer/overlay.tsx')
    ]
  },
  
  // Development/Production mode
  mode: isDevelopment ? 'development' : 'production',
  
  // Enable development tools
  devtool: isDevelopment ? 'eval-cheap-module-source-map' : 'source-map',
  
  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: isDevelopment ? '[name].js' : '[name].[contenthash:8].js',
    chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
    publicPath: './',
    clean: !isDevelopment,
    crossOriginLoading: false,
    hashFunction: 'xxhash64'
  },
  
  // Module resolution
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@components': path.resolve(__dirname, 'src/renderer/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@styles': path.resolve(__dirname, 'src/renderer/styles'),
      '@assets': path.resolve(__dirname, 'src/assets')
    },
    fallback: {
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "events": require.resolve("events/"),
      "fs": false,
      "net": false,
      "tls": false
    }
  },
  
  // Module rules for different file types
  module: {
    rules: [
      // TypeScript/JavaScript/React files
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    electron: '22.0.0'
                  },
                  useBuiltIns: 'entry',
                  corejs: 3,
                  modules: false
                }],
                ['@babel/preset-react', {
                  runtime: 'automatic',
                  development: isDevelopment
                }],
                '@babel/preset-typescript'
              ],
              plugins: [
                '@babel/plugin-syntax-dynamic-import',
                '@babel/plugin-transform-class-properties',
                '@babel/plugin-transform-object-rest-spread',
                ['@babel/plugin-proposal-decorators', { legacy: true }],
                ...(isDevelopment ? [['react-refresh/babel', { skipEnvCheck: true }]] : [])
              ],
              cacheDirectory: true,
              cacheCompression: false,
              compact: !isDevelopment
            }
          }
        ]
      },
      
      // CSS and SCSS files
      {
        test: /\.(css|scss)$/,
        type: 'javascript/auto',
        use: [
          // Extract CSS in production, use style-loader in development
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 3,
              sourceMap: isDevelopment,
              modules: {
                auto: (resourcePath) => {
                  // Enable CSS modules for .module.css files
                  return /\.module\.(css|scss)$/.test(resourcePath);
                },
                localIdentName: isDevelopment 
                  ? '[name]__[local]___[hash:base64:5]' 
                  : '[hash:base64:8]'
              }
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: isDevelopment,
              postcssOptions: {
                plugins: [
                  ['tailwindcss', {}],
                  ['autoprefixer', {}],
                  ...(!isDevelopment ? [
                    ['cssnano', {
                      preset: ['default', {
                        discardComments: { removeAll: true },
                        normalizeWhitespace: { exclude: false }
                      }]
                    }]
                  ] : [])
                ]
              }
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: isDevelopment,
              sassOptions: {
                includePaths: [path.resolve(__dirname, 'src/renderer/styles')]
              }
            }
          }
        ]
      },
      
      // Image files
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp|avif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8KB
          }
        },
        generator: {
          filename: 'images/[name].[contenthash:8][ext]'
        }
      },
      
      // Font files
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash:8][ext]'
        }
      },
      
      // Audio/Video files
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'media/[name].[contenthash:8][ext]'
        }
      },
      
      // SVG as React components (optional)
      {
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        resourceQuery: /react/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              prettier: false,
              svgo: true,
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false
                      }
                    }
                  }
                ]
              },
              titleProp: true
            }
          }
        ]
      }
    ]
  },
  
  // Webpack plugins
  plugins: [
    // Clean build directory
    new CleanWebpackPlugin(),
    
    // HTML templates
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/renderer/index.html'),
      filename: 'index.html',
      chunks: ['renderer'],
      inject: 'body',
      minify: !isDevelopment ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      } : false,
      templateParameters: {
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    }),
    
    // Overlay HTML template
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/renderer/overlay.html'),
      filename: 'overlay.html',
      chunks: ['overlay'],
      inject: 'body',
      minify: !isDevelopment ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      } : false,
      templateParameters: {
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    }),
    
    // Extract CSS in production
    ...(isDevelopment ? [] : [
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[name].[contenthash:8].chunk.css'
      })
    ]),
    
    // TypeScript type checking (disabled for build)
    // new ForkTsCheckerWebpackPlugin({
    //   async: isDevelopment,
    //   typescript: {
    //     configFile: path.resolve(__dirname, 'tsconfig.build.json'),
    //     diagnosticOptions: {
    //       semantic: true,
    //       syntactic: true
    //     }
    //   },
    //   logger: {
    //     infrastructure: 'silent',
    //     issues: 'console',
    //     devServer: false
    //   }
    // }),
    
    // ESLint plugin (disabled until ESLint config is added)
    // new ESLintPlugin({
    //   extensions: ['js', 'jsx', 'ts', 'tsx'],
    //   files: 'src/**/*.{js,jsx,ts,tsx}',
    //   cache: true,
    //   cacheLocation: path.resolve(__dirname, '.eslintcache'),
    //   fix: isDevelopment,
    //   failOnError: !isDevelopment,
    //   failOnWarning: false,
    //   quiet: false
    // }),
    
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
      'process.env.ELECTRON_ENV': JSON.stringify('renderer'),
      'process.env.PUBLIC_URL': JSON.stringify('./'),
      '__DEV__': JSON.stringify(isDevelopment)
    }),
    
    // Provide polyfills for Node.js globals
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    }),
    
    // Development-only plugins
    ...(isDevelopment ? [
      new webpack.HotModuleReplacementPlugin(),
      new ReactRefreshWebpackPlugin({
        overlay: {
          entry: path.resolve(__dirname, 'src/renderer/index.tsx'),
          module: path.resolve(__dirname, 'src/renderer/App.tsx'),
          sockIntegration: 'whm'
        }
      })
    ] : []),
    
    // Production-only plugins
    ...(!isDevelopment ? [
      // Bundle analyzer
      ...(isAnalyze ? [
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: path.resolve(__dirname, 'dist/renderer-bundle-report.html')
        })
      ] : [])
    ] : [])
  ].filter(Boolean),
  
  // Optimization settings
  optimization: {
    minimize: !isDevelopment,
    minimizer: [
      // JavaScript minification
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
            drop_console: !isDevelopment,
            drop_debugger: !isDevelopment,
            pure_funcs: !isDevelopment ? ['console.log', 'console.info'] : []
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
      }),
      
      // CSS minification
      new CssMinimizerPlugin({
        parallel: true,
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: { exclude: false }
            }
          ]
        }
      })
    ],
    
    // Split chunks configuration
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        // Vendor chunk for React and core libraries
        vendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
          name: 'vendor',
          priority: 20,
          chunks: 'all'
        },
        
        // UI libraries chunk
        ui: {
          test: /[\\/]node_modules[\\/](framer-motion|lucide-react|@headlessui|@heroicons)[\\/]/,
          name: 'ui',
          priority: 15,
          chunks: 'all'
        },
        
        // Utility libraries chunk
        utils: {
          test: /[\\/]node_modules[\\/](lodash|date-fns|classnames|clsx)[\\/]/,
          name: 'utils',
          priority: 10,
          chunks: 'all'
        },
        
        // Default chunk for other node_modules
        default: {
          test: /[\\/]node_modules[\\/]/,
          name: 'common',
          priority: 5,
          chunks: 'all',
          reuseExistingChunk: true
        }
      }
    },
    
    // Runtime chunk
    runtimeChunk: {
      name: 'runtime'
    },
    
    // Module IDs
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    
    // Tree shaking
    usedExports: true,
    sideEffects: false
  },
  
  // Development server configuration
  devServer: isDevelopment ? {
    static: {
      directory: path.resolve(__dirname, 'dist/renderer')
    },
    historyApiFallback: {
      disableDotRule: true
    },
    hot: true,
    liveReload: true,
    compress: true,
    port: 3000,
    host: 'localhost',
    open: false,
    client: {
      logging: 'warn',
      overlay: {
        errors: true,
        warnings: false
      },
      progress: true
    },
    devMiddleware: {
      writeToDisk: false,
      stats: 'errors-warnings'
    }
  } : undefined,
  
  // Performance hints
  performance: {
    hints: isDevelopment ? false : 'warning',
    maxEntrypointSize: 1024 * 1024 * 2, // 2MB
    maxAssetSize: 1024 * 1024, // 1MB
    assetFilter: (assetFilename) => {
      return !assetFilename.endsWith('.map');
    }
  },
  
  // Watch options for development
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: false
  },
  
  // Stats configuration
  stats: {
    preset: 'minimal',
    colors: true,
    errors: true,
    errorDetails: true,
    warnings: true,
    assets: false,
    modules: false,
    entrypoints: false,
    chunks: false,
    chunkModules: false,
    children: false,
    timings: true,
    version: false,
    builtAt: false,
    hash: false
  },
  
  // Cache configuration for faster builds
  cache: {
    type: 'filesystem',
    version: isDevelopment ? 'development' : 'production',
    buildDependencies: {
      config: [__filename],
      tsconfig: [path.resolve(__dirname, 'tsconfig.json')],
      postcss: [path.resolve(__dirname, 'postcss.config.js')],
      tailwind: [path.resolve(__dirname, 'tailwind.config.js')]
    },
    store: 'pack',
    compression: 'gzip'
  },
  
  // Experiments
  experiments: {
    topLevelAwait: true,
    css: false // Disable since we use css-loader
  },
  
  // External dependencies for Electron
  externals: {
    electron: 'commonjs2 electron'
  }
};