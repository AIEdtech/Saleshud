#!/usr/bin/env node

/**
 * Production Build Script
 * Builds all Electron processes for production distribution
 */

const webpack = require('webpack');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

// Import webpack configurations
const mainConfig = require('../webpack.main.config.js');
const rendererConfig = require('../webpack.renderer.config.js');
const preloadConfig = require('../webpack.preload.config.js');

// Set production environment
process.env.NODE_ENV = 'production';

console.log(chalk.blue('🏗️  Building SalesHud for Production...\n'));

// Clean dist directory
async function cleanDist() {
  console.log(chalk.cyan('🧹 Cleaning dist directory...'));
  try {
    await fs.remove(path.resolve(__dirname, '../dist'));
    console.log(chalk.green('✅ Dist directory cleaned'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to clean dist directory:'), error);
    throw error;
  }
}

// Build main process and preload scripts
async function buildMain() {
  return new Promise((resolve, reject) => {
    console.log(chalk.cyan('📦 Building Main Process and Preload Scripts...'));
    
    const compiler = webpack([mainConfig, preloadConfig]);
    
    compiler.run((err, stats) => {
      if (err) {
        console.error(chalk.red('❌ Main Process Build Failed:'));
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return reject(err);
      }
      
      const info = stats.toJson();
      
      if (stats.hasErrors()) {
        console.error(chalk.red('❌ Main Process Build Errors:'));
        info.errors.forEach(error => {
          console.error(error.message || error);
        });
        return reject(new Error('Main process build failed'));
      }
      
      if (stats.hasWarnings()) {
        console.warn(chalk.yellow('⚠️  Main Process Build Warnings:'));
        info.warnings.forEach(warning => {
          console.warn(warning.message || warning);
        });
      }
      
      // Display build statistics
      const mainStats = info.children[0]; // Main process
      const preloadStats = info.children[1]; // Preload scripts
      
      console.log(chalk.green('✅ Main Process Built Successfully'));
      console.log(chalk.gray(`   📊 Build Time: ${stats.endTime - stats.startTime}ms`));
      
      if (mainStats && mainStats.assets) {
        console.log(chalk.gray('   📁 Main Assets:'));
        mainStats.assets.forEach(asset => {
          const size = (asset.size / 1024).toFixed(2);
          console.log(chalk.gray(`      ${asset.name}: ${size} KB`));
        });
      }
      
      if (preloadStats && preloadStats.assets) {
        console.log(chalk.gray('   📁 Preload Assets:'));
        preloadStats.assets.forEach(asset => {
          const size = (asset.size / 1024).toFixed(2);
          console.log(chalk.gray(`      ${asset.name}: ${size} KB`));
        });
      }
      
      resolve(stats);
    });
  });
}

// Build renderer process
async function buildRenderer() {
  return new Promise((resolve, reject) => {
    console.log(chalk.cyan('🌐 Building Renderer Process...'));
    
    const compiler = webpack(rendererConfig);
    
    compiler.run((err, stats) => {
      if (err) {
        console.error(chalk.red('❌ Renderer Process Build Failed:'));
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return reject(err);
      }
      
      const info = stats.toJson();
      
      if (stats.hasErrors()) {
        console.error(chalk.red('❌ Renderer Process Build Errors:'));
        info.errors.forEach(error => {
          console.error(error.message || error);
        });
        return reject(new Error('Renderer process build failed'));
      }
      
      if (stats.hasWarnings()) {
        console.warn(chalk.yellow('⚠️  Renderer Process Build Warnings:'));
        info.warnings.forEach(warning => {
          console.warn(warning.message || warning);
        });
      }
      
      console.log(chalk.green('✅ Renderer Process Built Successfully'));
      console.log(chalk.gray(`   📊 Build Time: ${stats.endTime - stats.startTime}ms`));
      
      // Display asset information
      if (info.assets) {
        console.log(chalk.gray('   📁 Renderer Assets:'));
        info.assets
          .filter(asset => !asset.name.endsWith('.map'))
          .sort((a, b) => b.size - a.size)
          .slice(0, 10) // Show top 10 largest assets
          .forEach(asset => {
            const size = (asset.size / 1024).toFixed(2);
            console.log(chalk.gray(`      ${asset.name}: ${size} KB`));
          });
      }
      
      // Display chunk information
      if (info.chunks) {
        const totalSize = info.chunks.reduce((total, chunk) => total + chunk.size, 0);
        console.log(chalk.gray(`   📦 Total Bundle Size: ${(totalSize / 1024).toFixed(2)} KB`));
        console.log(chalk.gray(`   📦 Chunks: ${info.chunks.length}`));
      }
      
      resolve(stats);
    });
  });
}

// Copy static assets
async function copyAssets() {
  console.log(chalk.cyan('📋 Copying static assets...'));
  
  const assetsPath = path.resolve(__dirname, '../src/assets');
  const distAssetsPath = path.resolve(__dirname, '../dist/renderer/assets');
  
  try {
    if (await fs.pathExists(assetsPath)) {
      await fs.copy(assetsPath, distAssetsPath);
      console.log(chalk.green('✅ Static assets copied'));
    } else {
      console.log(chalk.yellow('⚠️  No static assets found to copy'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to copy static assets:'), error);
    throw error;
  }
}

// Generate package.json for distribution
async function generateDistPackageJson() {
  console.log(chalk.cyan('📄 Generating distribution package.json...'));
  
  try {
    const packageJson = await fs.readJson(path.resolve(__dirname, '../package.json'));
    
    // Create minimal package.json for distribution
    const distPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: './main/main.js',
      author: packageJson.author,
      license: packageJson.license,
      homepage: packageJson.homepage,
      dependencies: {
        // Only include production dependencies that are actually needed
        ...(packageJson.dependencies && {
          electron: packageJson.dependencies.electron
        })
      }
    };
    
    await fs.writeJson(
      path.resolve(__dirname, '../dist/package.json'),
      distPackageJson,
      { spaces: 2 }
    );
    
    console.log(chalk.green('✅ Distribution package.json generated'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to generate distribution package.json:'), error);
    throw error;
  }
}

// Analyze bundle sizes
async function analyzeBundles() {
  if (process.env.ANALYZE === 'true') {
    console.log(chalk.cyan('📊 Bundle analysis reports generated:'));
    console.log(chalk.gray('   📈 Main Process: dist/main-bundle-report.html'));
    console.log(chalk.gray('   📈 Renderer Process: dist/renderer-bundle-report.html'));
    console.log(chalk.gray('   📈 Preload Scripts: dist/preload-bundle-report.html'));
  }
}

// Validate build output
async function validateBuild() {
  console.log(chalk.cyan('🔍 Validating build output...'));
  
  const requiredFiles = [
    'dist/main/main.js',
    'dist/main/preload.js',
    'dist/renderer/index.html',
    'dist/renderer/renderer.js',
    'dist/package.json'
  ];
  
  try {
    for (const filePath of requiredFiles) {
      const fullPath = path.resolve(__dirname, '..', filePath);
      if (!(await fs.pathExists(fullPath))) {
        throw new Error(`Required file missing: ${filePath}`);
      }
      
      const stats = await fs.stat(fullPath);
      if (stats.size === 0) {
        throw new Error(`Required file is empty: ${filePath}`);
      }
    }
    
    console.log(chalk.green('✅ Build validation passed'));
    
    // Display build summary
    const distPath = path.resolve(__dirname, '../dist');
    const distStats = await fs.stat(distPath);
    
    console.log(chalk.green('\n🎉 Build completed successfully!'));
    console.log(chalk.gray(`📁 Output directory: ${distPath}`));
    console.log(chalk.gray(`📊 Build completed at: ${new Date().toLocaleString()}`));
    
  } catch (error) {
    console.error(chalk.red('❌ Build validation failed:'), error.message);
    throw error;
  }
}

// Performance monitoring
function measureTime(label) {
  const start = Date.now();
  return () => {
    const end = Date.now();
    console.log(chalk.gray(`⏱️  ${label}: ${end - start}ms`));
  };
}

// Main build process
async function build() {
  const totalTime = measureTime('Total Build Time');
  
  try {
    // Clean previous build
    await cleanDist();
    
    // Build processes in parallel for better performance
    const mainTime = measureTime('Main Process Build');
    const rendererTime = measureTime('Renderer Process Build');
    
    const [mainStats, rendererStats] = await Promise.all([
      buildMain().then(stats => {
        mainTime();
        return stats;
      }),
      buildRenderer().then(stats => {
        rendererTime();
        return stats;
      })
    ]);
    
    // Copy assets and generate package.json
    await Promise.all([
      copyAssets(),
      generateDistPackageJson()
    ]);
    
    // Validate build
    await validateBuild();
    
    // Analyze bundles if requested
    await analyzeBundles();
    
    totalTime();
    
    console.log(chalk.green('\n🚀 SalesHud is ready for distribution!'));
    console.log(chalk.cyan('💡 Next steps:'));
    console.log(chalk.cyan('   • Run "npm run dist" to create installers'));
    console.log(chalk.cyan('   • Run "npm run start" to test the production build'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Build failed:'), error.message);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Start the build process
build();