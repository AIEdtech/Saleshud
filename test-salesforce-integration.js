#!/usr/bin/env node
/**
 * Test Salesforce CRM Integration via Zapier
 * Tests the SalesforceService and MeetingManager CRM sync functionality
 */

const { SalesforceService } = require('./src/services/SalesforceService');

// Test configuration
const testConfig = {
  zapierWebhookUrl: process.env.ZAPIER_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/test123/webhook456',
  zapierApiKey: process.env.ZAPIER_API_KEY,
  syncInterval: 0, // Disable interval for testing
  enableRealTimeSync: true,
  customWebhooks: {
    onContactCreate: process.env.ZAPIER_CONTACT_WEBHOOK,
    onOpportunityUpdate: process.env.ZAPIER_OPPORTUNITY_WEBHOOK,
    onActivityLog: process.env.ZAPIER_ACTIVITY_WEBHOOK
  }
};

// Sample meeting data for testing
const sampleMeetingData = {
  meetingId: 'test-meeting-123',
  participants: [
    {
      email: 'john.doe@prospectco.com',
      name: 'John Doe',
      role: 'Host'
    },
    {
      email: 'sarah.smith@prospectco.com',
      name: 'Sarah Smith',
      role: 'Attendee'
    }
  ],
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  duration: 60,
  summary: 'Discussed product features and pricing for Q1 implementation',
  keyPoints: [
    'Client interested in enterprise plan',
    'Budget approved for $50k annually',
    'Timeline: Implementation by March 2024',
    'Integration with existing Salesforce required'
  ],
  actionItems: [
    {
      task: 'Send proposal with enterprise pricing',
      assignee: 'john.doe@saleshud.com',
      dueDate: new Date('2024-01-17T17:00:00Z')
    },
    {
      task: 'Schedule technical integration call',
      assignee: 'sarah.smith@prospectco.com',
      dueDate: new Date('2024-01-20T14:00:00Z')
    }
  ],
  sentiment: {
    overall: 85,
    breakdown: {
      engagement: 90,
      clarity: 80,
      interest: 85
    }
  },
  dealProbability: 75,
  competitorsmentioned: ['hubspot', 'pipedrive'],
  productsDiscussed: ['saleshud', 'crm integration', 'sales intelligence'],
  nextSteps: 'Follow up with proposal and schedule technical call'
};

/**
 * Test Salesforce service initialization
 */
async function testServiceInitialization() {
  console.log('\n🧪 Testing Salesforce Service Initialization...');
  
  try {
    const salesforce = new SalesforceService(testConfig);
    await salesforce.initialize();
    
    console.log('✅ Salesforce service initialized successfully');
    return salesforce;
  } catch (error) {
    console.error('❌ Failed to initialize Salesforce service:', error.message);
    throw error;
  }
}

/**
 * Test contact upsert
 */
async function testContactUpsert(salesforce) {
  console.log('\n🧪 Testing Contact Upsert...');
  
  try {
    const contact = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@prospectco.com',
      title: 'VP of Sales',
      company: 'Prospect Company Inc.'
    };
    
    const result = await salesforce.upsertContact(contact);
    console.log('✅ Contact upserted successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Contact upsert failed:', error.message);
    throw error;
  }
}

/**
 * Test activity creation
 */
async function testActivityCreation(salesforce) {
  console.log('\n🧪 Testing Activity Creation...');
  
  try {
    const activity = {
      type: 'Meeting',
      subject: 'Sales Discovery Call',
      description: 'Initial discovery call to understand requirements',
      startDateTime: new Date('2024-01-15T10:00:00Z'),
      endDateTime: new Date('2024-01-15T11:00:00Z'),
      duration: 60,
      participants: ['john.doe@prospectco.com', 'sarah.smith@saleshud.com']
    };
    
    const result = await salesforce.createActivity(activity);
    console.log('✅ Activity created successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Activity creation failed:', error.message);
    throw error;
  }
}

/**
 * Test task creation
 */
async function testTaskCreation(salesforce) {
  console.log('\n🧪 Testing Task Creation...');
  
  try {
    const task = {
      subject: 'Follow up with proposal',
      description: 'Send detailed proposal with pricing and timeline',
      status: 'Not Started',
      priority: 'High',
      dueDate: new Date('2024-01-17T17:00:00Z'),
      type: 'Email'
    };
    
    const result = await salesforce.createTask(task);
    console.log('✅ Task created successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Task creation failed:', error.message);
    throw error;
  }
}

/**
 * Test meeting sync to CRM
 */
async function testMeetingSync(salesforce) {
  console.log('\n🧪 Testing Meeting Sync to CRM...');
  
  try {
    const syncResult = await salesforce.syncMeetingToCRM(sampleMeetingData);
    
    if (syncResult.success) {
      console.log('✅ Meeting synced successfully to CRM');
      console.log(`   Records processed: ${syncResult.recordsProcessed}`);
      console.log(`   Duration: ${syncResult.duration}ms`);
      console.log(`   Sync ID: ${syncResult.syncId}`);
    } else {
      console.error('❌ Meeting sync failed');
      console.error('   Errors:', syncResult.errors);
    }
    
    return syncResult;
  } catch (error) {
    console.error('❌ Meeting sync failed:', error.message);
    throw error;
  }
}

/**
 * Test webhook handling
 */
async function testWebhookHandling(salesforce) {
  console.log('\n🧪 Testing Webhook Handling...');
  
  try {
    // Register custom handler
    salesforce.registerWebhookHandler('test.event', (data) => {
      console.log('📨 Received test webhook:', data);
    });
    
    // Simulate incoming webhook
    await salesforce.handleIncomingWebhook('test.event', {
      message: 'Test webhook data',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Webhook handling test completed');
  } catch (error) {
    console.error('❌ Webhook handling failed:', error.message);
    throw error;
  }
}

/**
 * Test bulk operations
 */
async function testBulkOperations(salesforce) {
  console.log('\n🧪 Testing Bulk Operations...');
  
  try {
    // Update config to enable bulk operations
    salesforce.config = { ...salesforce.config, enableBulkOperations: true };
    
    const contacts = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company1.com',
        company: 'Company One'
      },
      {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@company2.com',
        company: 'Company Two'
      }
    ];
    
    const result = await salesforce.bulkUpsert('contact', contacts);
    
    if (result.success) {
      console.log('✅ Bulk upsert completed successfully');
      console.log(`   Records processed: ${result.recordsProcessed}`);
      console.log(`   Records failed: ${result.recordsFailed}`);
    } else {
      console.error('❌ Bulk upsert failed');
      console.error('   Errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Bulk operations failed:', error.message);
    throw error;
  }
}

/**
 * Test service status and health
 */
async function testServiceStatus(salesforce) {
  console.log('\n🧪 Testing Service Status...');
  
  try {
    const status = salesforce.getSyncStatus();
    console.log('📊 Service Status:');
    console.log(`   Initialized: ${status.isInitialized}`);
    console.log(`   Sync Queue Size: ${status.syncQueueSize}`);
    console.log(`   Retry Queue Size: ${status.retryQueueSize}`);
    console.log(`   Is Syncing: ${status.isSyncing}`);
    
    console.log('✅ Service status check completed');
  } catch (error) {
    console.error('❌ Service status check failed:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Salesforce CRM Integration Tests...');
  console.log('================================================');
  
  let salesforce = null;
  
  try {
    // Initialize service
    salesforce = await testServiceInitialization();
    
    // Run individual tests
    await testContactUpsert(salesforce);
    await testActivityCreation(salesforce);
    await testTaskCreation(salesforce);
    await testMeetingSync(salesforce);
    await testWebhookHandling(salesforce);
    await testBulkOperations(salesforce);
    await testServiceStatus(salesforce);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('================================================');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    console.error('================================================');
    process.exit(1);
    
  } finally {
    // Cleanup
    if (salesforce) {
      await salesforce.shutdown();
      console.log('🧹 Service cleanup completed');
    }
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...');
  
  try {
    // Test with invalid config
    const invalidConfig = {
      zapierWebhookUrl: 'invalid-url'
    };
    
    const salesforce = new SalesforceService(invalidConfig);
    
    try {
      await salesforce.initialize();
      console.error('❌ Should have failed with invalid config');
    } catch (error) {
      console.log('✅ Error handling working correctly:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
  }
}

/**
 * Performance test
 */
async function testPerformance(salesforce) {
  console.log('\n🧪 Testing Performance...');
  
  const startTime = Date.now();
  const iterations = 5;
  
  try {
    const promises = [];
    
    for (let i = 0; i < iterations; i++) {
      const contact = {
        firstName: `Test${i}`,
        lastName: 'User',
        email: `test${i}@example.com`,
        company: 'Test Company'
      };
      
      promises.push(salesforce.upsertContact(contact));
    }
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;
    
    console.log(`✅ Performance test completed`);
    console.log(`   Total time: ${duration}ms`);
    console.log(`   Average time per operation: ${avgTime.toFixed(2)}ms`);
    console.log(`   Operations per second: ${(1000 / avgTime).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

// Check if running directly
if (require.main === module) {
  // Check environment variables
  if (!process.env.ZAPIER_WEBHOOK_URL) {
    console.warn('⚠️  ZAPIER_WEBHOOK_URL not set - using test URL');
  }
  
  // Run tests
  runTests().catch(console.error);
}

module.exports = {
  testServiceInitialization,
  testContactUpsert,
  testActivityCreation,
  testTaskCreation,
  testMeetingSync,
  testWebhookHandling,
  testBulkOperations,
  testServiceStatus,
  testErrorHandling,
  testPerformance,
  runTests
};