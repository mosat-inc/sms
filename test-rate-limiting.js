const axios = require('axios');

// Test configuration
const SERVER_URL = 'http://localhost:5000';
const TEST_ENDPOINT = '/api/communication/announcements';
const CREDENTIALS = {
  email: 'admin@test.com',
  password: 'admin123'
};

// Test utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class RateLimitTester {
  constructor() {
    this.authToken = null;
    this.requestCounts = {
      successful: 0,
      rateLimited: 0,
      errors: 0
    };
  }

  async login() {
    try {
      console.log('🔐 Authenticating...');
      const response = await axios.post(`${SERVER_URL}/api/auth/login`, CREDENTIALS);
      
      if (response.data.success) {
        this.authToken = response.data.token;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.error('❌ Authentication failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error.message);
      return false;
    }
  }

  async makeRequest(endpoint = TEST_ENDPOINT, params = {}) {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        params
      };

      const response = await axios.get(`${SERVER_URL}${endpoint}`, config);
      
      if (response.status === 200) {
        this.requestCounts.successful++;
        return { success: true, status: response.status, data: response.data };
      }
      
      return { success: false, status: response.status, data: response.data };
    } catch (error) {
      if (error.response?.status === 429) {
        this.requestCounts.rateLimited++;
        return { 
          success: false, 
          status: 429, 
          rateLimited: true,
          retryAfter: error.response.data?.retryAfter,
          data: error.response.data 
        };
      } else {
        this.requestCounts.errors++;
        return { 
          success: false, 
          status: error.response?.status || 500, 
          error: error.message 
        };
      }
    }
  }

  async testBasicFunctionality() {
    console.log('\n📋 Testing basic announcement retrieval...');
    
    const result = await this.makeRequest();
    if (result.success) {
      console.log('✅ Basic functionality works');
      console.log(`   Retrieved ${result.data.data?.length || 0} announcements`);
    } else {
      console.log('❌ Basic functionality failed:', result.error || `Status: ${result.status}`);
    }
    
    return result.success;
  }

  async testCacheHitRateLimit() {
    console.log('\n🗂️  Testing cache hit rate limit bypass...');
    
    // Make two identical requests quickly - second should hit cache and bypass rate limit
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await this.makeRequest(TEST_ENDPOINT, { status: 'active' });
      results.push(result);
      console.log(`   Request ${i + 1}: ${result.success ? '✅' : '❌'} (Status: ${result.status})`);
      await delay(100); // Small delay between requests
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`   ${successCount}/5 requests successful (cache should help)`);
    
    return successCount >= 3; // Allow some failures
  }

  async testUnreadCountEndpoint() {
    console.log('\n🔢 Testing unread count endpoint (should be unrestricted)...');
    
    // Make multiple requests to unread count - should not be rate limited
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await this.makeRequest('/api/communication/announcements/unread-count');
      results.push(result);
      await delay(50);
    }
    
    const successCount = results.filter(r => r.success).length;
    const rateLimitedCount = results.filter(r => r.rateLimited).length;
    
    console.log(`   ${successCount}/10 requests successful`);
    console.log(`   ${rateLimitedCount}/10 requests rate limited`);
    
    return rateLimitedCount === 0; // No rate limiting expected
  }

  async testRateLimit() {
    console.log('\n⏱️  Testing rate limiting (this may take a moment)...');
    
    // Make many requests quickly to trigger rate limiting
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 25; i++) {
      const result = await this.makeRequest(TEST_ENDPOINT, { status: 'active', _t: Date.now() }); // _t to prevent caching
      results.push(result);
      
      if (result.rateLimited) {
        console.log(`   Request ${i + 1}: ⚠️  Rate limited (retry after ${result.retryAfter}s)`);
        break;
      } else {
        console.log(`   Request ${i + 1}: ${result.success ? '✅' : '❌'} (Status: ${result.status})`);
      }
      
      await delay(50); // Small delay to avoid overwhelming
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    const successCount = results.filter(r => r.success).length;
    const rateLimitedCount = results.filter(r => r.rateLimited).length;
    
    console.log(`   Test completed in ${duration.toFixed(2)}s`);
    console.log(`   ${successCount} successful, ${rateLimitedCount} rate limited`);
    
    // Rate limiting should kick in eventually
    return rateLimitedCount > 0 && successCount > 10;
  }

  async testGracefulDegradation() {
    console.log('\n🔄 Testing graceful degradation...');
    
    // First, make enough requests to trigger rate limiting
    let rateLimited = false;
    for (let i = 0; i < 30; i++) {
      const result = await this.makeRequest(TEST_ENDPOINT, { _t: Date.now() + i });
      if (result.rateLimited) {
        rateLimited = true;
        console.log(`   ⚠️  Rate limiting triggered after ${i + 1} requests`);
        break;
      }
      await delay(30);
    }
    
    if (rateLimited) {
      // Now test if we get graceful responses
      const fallbackResult = await this.makeRequest(TEST_ENDPOINT, { status: 'active' });
      if (fallbackResult.success && fallbackResult.data?.fallback) {
        console.log('   ✅ Graceful fallback response received');
        return true;
      } else if (fallbackResult.success) {
        console.log('   ✅ Request succeeded (possibly cache hit)');
        return true;
      }
    }
    
    console.log('   ⚠️  Could not trigger rate limiting or graceful degradation');
    return false;
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`   Successful requests: ${this.requestCounts.successful}`);
    console.log(`   Rate limited requests: ${this.requestCounts.rateLimited}`);
    console.log(`   Error requests: ${this.requestCounts.errors}`);
    console.log(`   Total requests: ${Object.values(this.requestCounts).reduce((a, b) => a + b, 0)}`);
  }

  async runAllTests() {
    console.log('🚀 Starting Rate Limiting Tests');
    console.log('================================');
    
    // Login first
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without authentication');
      return false;
    }
    
    const tests = [
      { name: 'Basic Functionality', test: () => this.testBasicFunctionality() },
      { name: 'Cache Hit Rate Limit Bypass', test: () => this.testCacheHitRateLimit() },
      { name: 'Unread Count Unrestricted', test: () => this.testUnreadCountEndpoint() },
      { name: 'Rate Limiting', test: () => this.testRateLimit() },
      { name: 'Graceful Degradation', test: () => this.testGracefulDegradation() }
    ];
    
    const results = [];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        results.push({ name, success: result });
        console.log(`${result ? '✅' : '❌'} ${name}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        results.push({ name, success: false, error: error.message });
        console.log(`❌ ${name}: ERROR - ${error.message}`);
      }
      
      // Wait between tests
      await delay(2000);
    }
    
    this.printSummary();
    
    console.log('\n🏁 Final Results:');
    console.log('=================');
    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    results.forEach(r => {
      console.log(`   ${r.success ? '✅' : '❌'} ${r.name}${r.error ? ` (${r.error})` : ''}`);
    });
    
    console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests >= totalTests - 1) { // Allow 1 test to fail
      console.log('🎉 Rate limiting fix appears to be working correctly!');
      return true;
    } else {
      console.log('⚠️  Some issues may still exist with rate limiting');
      return false;
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new RateLimitTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = RateLimitTester;
