#!/usr/bin/env node

/**
 * Development Build Script
 * Concurrently builds and watches all Electron processes
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const electron = require('electron');

// Import webpack configurations
const mainConfig = require('../webpack.main.config.js');
const rendererConfig = require('../webpack.renderer.config.js');
const preloadConfig = require('../webpack.preload.config.js');

let electronProcess = null;
let manualRestart = false;

// Set development environment
process.env.NODE_ENV = 'development';

console.log(chalk.blue('🚀 Starting SalesHud Development Server...\n'));

// Start main process and preload compilation
async function startMain() {
  return new Promise((resolve, reject) => {
    const compiler = webpack([mainConfig, preloadConfig]);
    
    compiler.hooks.watchRun.tapAsync('Dev', (compilation, done) => {
      console.log(chalk.cyan('📦 Compiling Main Process...'));
      done();
    });
    
    compiler.watch({
      aggregateTimeout: 300,
      poll: undefined
    }, (err, stats) => {
      if (err) {
        console.error(chalk.red('❌ Main Process Compilation Failed:'));
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return reject(err);
      }
      
      const info = stats.toJson();
      
      if (stats.hasErrors()) {
        console.error(chalk.red('❌ Main Process Compilation Errors:'));
        info.errors.forEach(error => console.error(error));
        return;
      }
      
      if (stats.hasWarnings()) {
        console.warn(chalk.yellow('⚠️  Main Process Compilation Warnings:'));
        info.warnings.forEach(warning => console.warn(warning));
      }
      
      console.log(chalk.green('✅ Main Process Compiled Successfully'));
      
      // Start or restart Electron
      if (!electronProcess && !manualRestart) {
        startElectron();
      } else if (electronProcess && !manualRestart) {
        manualRestart = true;
        electronProcess.kill('SIGTERM');
        electronProcess = null;
        
        setTimeout(() => {
          manualRestart = false;
          startElectron();
        }, 2000);
      }
      
      resolve();
    });
  });
}

// Start renderer process with dev server
async function startRenderer() {
  return new Promise((resolve, reject) => {
    const compiler = webpack(rendererConfig);
    const devServerOptions = {
      ...rendererConfig.devServer,
      open: false,
      setupExitSignals: false
    };
    
    const server = new WebpackDevServer(devServerOptions, compiler);
    
    compiler.hooks.done.tap('Dev', (stats) => {
      const info = stats.toJson();
      
      if (stats.hasErrors()) {
        console.error(chalk.red('❌ Renderer Process Compilation Errors:'));
        info.errors.forEach(error => console.error(error.message));
        return;
      }
      
      if (stats.hasWarnings()) {
        console.warn(chalk.yellow('⚠️  Renderer Process Compilation Warnings:'));
        info.warnings.forEach(warning => console.warn(warning.message));
      }
      
      console.log(chalk.green('✅ Renderer Process Compiled Successfully'));
    });
    
    server.start().then(() => {
      console.log(chalk.green('🌐 Renderer Dev Server Started on http://localhost:3000'));
      resolve();
    }).catch(reject);
  });
}

// Start Electron process
function startElectron() {
  const args = [
    '--inspect=5858',
    '--remote-debugging-port=9222'
  ];
  
  electronProcess = spawn(electron, [
    'dist/main/main.js',
    ...args
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_IS_DEV: '1'
    }
  });
  
  electronProcess.on('close', (code) => {
    if (!manualRestart) {
      console.log(chalk.yellow(`🔄 Electron exited with code ${code}`));
      process.exit(code);
    }
  });
  
  electronProcess.on('error', (error) => {
    console.error(chalk.red('❌ Electron Process Error:'), error);
  });
  
  console.log(chalk.green('⚡ Electron Started'));
}

// Handle process termination
function exitHandler(options, exitCode) {
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }
  
  if (options.exit) {
    process.exit();
  }
}

// Cleanup on exit
process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

// Start development servers
async function startDevelopment() {
  try {
    // Start renderer dev server first
    await startRenderer();
    
    // Then start main process compilation and Electron
    await startMain();
    
    console.log(chalk.green('\n🎉 SalesHud Development Server Running!'));
    console.log(chalk.cyan('📱 Main Process: Watching for changes...'));
    console.log(chalk.cyan('🌐 Renderer Process: http://localhost:3000'));
    console.log(chalk.cyan('🔍 DevTools: Remote debugging on port 9222'));
    console.log(chalk.gray('\nPress Ctrl+C to stop the development server.\n'));
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to start development server:'), error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
});

// Start the development process
startDevelopment();