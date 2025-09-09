#!/usr/bin/env node

/**
 * Service Testing Script
 * Tests individual services to ensure they're working correctly
 */

const path = require('path');
const { config } = require('dotenv');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function checkEnvVar(name, isRequired = true) {
  const value = process.env[name];
  const status = value ? '✓' : '✗';
  const color = value ? 'green' : (isRequired ? 'red' : 'yellow');
  const message = value ? 
    `${status} ${name}: ${value.substring(0, 20)}...` : 
    `${status} ${name}: Not set${isRequired ? ' (REQUIRED)' : ' (optional)'}`;
  
  log(message, color);
  return !!value;
}

async function testSupabaseConnection() {
  logSection('Testing Supabase Connection');
  
  const hasUrl = checkEnvVar('VITE_SUPABASE_URL');
  const hasAnonKey = checkEnvVar('VITE_SUPABASE_ANON_KEY');
  const hasServiceKey = checkEnvVar('VITE_SUPABASE_SERVICE_KEY');
  
  if (!hasUrl || !hasAnonKey) {
    log('⚠️  Missing required Supabase configuration', 'yellow');
    return false;
  }
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Test connection with a simple query
    const { data, error } = await supabase.from('meetings').select('count', { count: 'exact', head: true });
    
    if (error) {
      log(`✗ Supabase connection failed: ${error.message}`, 'red');
      return false;
    }
    
    log('✓ Supabase connection successful', 'green');
    return true;
  } catch (error) {
    log(`✗ Supabase test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testClaudeAPI() {
  logSection('Testing Claude/Anthropic API');
  
  const hasApiKey = checkEnvVar('VITE_CLAUDE_API_KEY') || checkEnvVar('VITE_ANTHROPIC_API_KEY');
  
  if (!hasApiKey) {
    log('⚠️  Missing Claude/Anthropic API key', 'yellow');
    return false;
  }
  
  const apiKey = process.env.VITE_CLAUDE_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-4-sonnet-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Say "API test successful" and nothing else.'
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      log(`✗ Claude API test failed: ${response.status} - ${error}`, 'red');
      return false;
    }
    
    const data = await response.json();
    log('✓ Claude API connection successful', 'green');
    log(`  Response: ${data.content[0].text}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Claude API test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testDeepgramAPI() {
  logSection('Testing Deepgram API');
  
  const hasApiKey = checkEnvVar('VITE_DEEPGRAM_API_KEY');
  const hasApiUrl = checkEnvVar('VITE_DEEPGRAM_API_URL');
  const hasModel = checkEnvVar('VITE_DEEPGRAM_MODEL');
  const hasLanguage = checkEnvVar('VITE_DEEPGRAM_LANGUAGE');
  
  if (!hasApiKey) {
    log('⚠️  Missing Deepgram API key', 'yellow');
    return false;
  }
  
  try {
    // Test with a simple GET request to validate API key
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        'Authorization': `Token ${process.env.VITE_DEEPGRAM_API_KEY}`
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      log(`✗ Deepgram API test failed: ${response.status} - ${error}`, 'red');
      return false;
    }
    
    log('✓ Deepgram API connection successful', 'green');
    log(`  Model: ${process.env.VITE_DEEPGRAM_MODEL}`, 'green');
    log(`  Language: ${process.env.VITE_DEEPGRAM_LANGUAGE}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Deepgram API test failed: ${error.message}`, 'red');
    return false;
  }
}

function checkEmailConfiguration() {
  logSection('Checking Email Configuration');
  
  // SMTP Configuration
  log('SMTP Configuration:', 'blue');
  const hasSmtpHost = checkEnvVar('VITE_SMTP_HOST', false);
  const hasSmtpPort = checkEnvVar('VITE_SMTP_PORT', false);
  const hasSmtpUser = checkEnvVar('VITE_SMTP_USER', false);
  const hasSmtpPass = checkEnvVar('VITE_SMTP_PASS', false);
  const hasEmailFrom = checkEnvVar('VITE_EMAIL_FROM', false);
  
  const smtpConfigured = hasSmtpHost && hasSmtpPort && hasSmtpUser && hasSmtpPass;
  
  // SendGrid Configuration
  log('\nSendGrid Configuration:', 'blue');
  const hasSendgridKey = checkEnvVar('VITE_SENDGRID_API_KEY', false);
  
  if (!smtpConfigured && !hasSendgridKey) {
    log('\n⚠️  No email service configured (SMTP or SendGrid)', 'yellow');
    return false;
  }
  
  if (smtpConfigured) {
    log('\n✓ SMTP email service configured', 'green');
  }
  if (hasSendgridKey) {
    log('✓ SendGrid email service configured', 'green');
  }
  
  return true;
}

function checkFeatureFlags() {
  logSection('Feature Flags');
  
  checkEnvVar('VITE_ENABLE_AI_INSIGHTS', false);
  checkEnvVar('VITE_ENABLE_REAL_TIME_TRANSCRIPTION', false);
  checkEnvVar('VITE_ENABLE_EMAIL_GENERATION', false);
  checkEnvVar('VITE_ENABLE_ANALYTICS', false);
  
  return true;
}

function checkAnalyticsServices() {
  logSection('Analytics Services');
  
  const hasSentry = checkEnvVar('VITE_SENTRY_DSN', false);
  const hasMixpanel = checkEnvVar('VITE_MIXPANEL_TOKEN', false);
  
  if (!hasSentry && !hasMixpanel) {
    log('\n⚠️  No analytics services configured', 'yellow');
    return false;
  }
  
  return true;
}

function checkApplicationConfig() {
  logSection('Application Configuration');
  
  checkEnvVar('NODE_ENV');
  checkEnvVar('VITE_APP_ENV');
  checkEnvVar('VITE_APP_NAME');
  checkEnvVar('VITE_APP_VERSION');
  checkEnvVar('VITE_API_BASE_URL');
  checkEnvVar('VITE_WS_BASE_URL');
  checkEnvVar('VITE_UPDATE_FEED_URL', false);
  checkEnvVar('VITE_DEBUG', false);
  checkEnvVar('VITE_LOG_LEVEL', false);
  
  return true;
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'magenta');
  log('        SALESHUD SERVICE TESTING SUITE', 'magenta');
  log('='.repeat(60), 'magenta');
  
  const results = {
    application: checkApplicationConfig(),
    supabase: await testSupabaseConnection(),
    claude: await testClaudeAPI(),
    deepgram: await testDeepgramAPI(),
    email: checkEmailConfiguration(),
    features: checkFeatureFlags(),
    analytics: checkAnalyticsServices()
  };
  
  logSection('Test Summary');
  
  let allPassed = true;
  for (const [service, passed] of Object.entries(results)) {
    const status = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`${status} ${service.charAt(0).toUpperCase() + service.slice(1)}`, color);
    if (!passed) allPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    log('✓ All services configured and tested successfully!', 'green');
  } else {
    log('⚠️  Some services need configuration or have issues', 'yellow');
    log('Please check the .env file and ensure all required services are properly configured', 'yellow');
  }
  console.log('='.repeat(60) + '\n');
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  log(`\n✗ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});