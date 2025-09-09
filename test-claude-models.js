#!/usr/bin/env node

/**
 * Test available Claude models
 */

const path = require('path');
const { config } = require('dotenv');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.VITE_CLAUDE_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

const models = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2'
];

async function testModel(model) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Say "yes"'
        }]
      })
    });
    
    if (response.ok) {
      console.log(`✓ ${model} - Available`);
      return true;
    } else {
      const error = await response.json();
      if (error.error?.type === 'not_found_error') {
        console.log(`✗ ${model} - Not available`);
      } else {
        console.log(`⚠ ${model} - Error: ${error.error?.message || response.status}`);
      }
      return false;
    }
  } catch (error) {
    console.log(`✗ ${model} - Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing available Claude models with your API key...\n');
  
  if (!apiKey) {
    console.error('No API key found! Please set VITE_CLAUDE_API_KEY or VITE_ANTHROPIC_API_KEY');
    process.exit(1);
  }
  
  for (const model of models) {
    await testModel(model);
  }
  
  console.log('\nNote: Claude 4.0 models may not be publicly available yet.');
  console.log('The latest stable model is typically claude-3-5-sonnet-20241022');
}

main();