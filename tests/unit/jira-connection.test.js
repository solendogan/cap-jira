/**
 * JIRA API Integration Tests
 * This file contains unit tests for testing JIRA API connectivity
 * with different header configurations and API versions.
 */

const axios = require('axios');
require('dotenv').config();

/**
 * Test JIRA connection using API v2 with browser-like headers
 * @deprecated This version uses older API v2 and complex headers that may be blocked
 */
async function testJiraConnectionV2() {
  const config = {
    baseURL: process.env.JIRA_BASE_URL || 'https://sanofi.atlassian.net',
    timeout: 30000,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    }
  };

  console.log('Testing connection with API v2 and browser headers:', {
    baseURL: config.baseURL,
    username: process.env.JIRA_USERNAME,
    hasToken: !!process.env.JIRA_API_TOKEN
  });

  try {
    const response = await axios.get('/rest/api/2/myself', config);
    console.log('✅ Connection successful!');
    console.log('User:', response.data.displayName);
    console.log('Email:', response.data.emailAddress);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', error.response?.data?.substring(0, 200) + '...');
    return false;
  }
}

/**
 * Test JIRA connection using API v3 with minimal headers
 * @recommended This is the preferred method for server-to-server communication
 */
async function testJiraConnectionV3() {
  try {
    console.log('Testing JIRA connection with API v3 and minimal headers...');
    
    const auth = Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    const config = {
      method: 'GET',
      url: `${process.env.JIRA_BASE_URL || 'https://sanofi.atlassian.net'}/rest/api/3/myself`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 30000
    };
    
    console.log('Making request with config:', {
      url: config.url,
      headers: {
        ...config.headers,
        Authorization: 'Basic [HIDDEN]'
      }
    });
    
    const response = await axios(config);
    console.log('✅ Success!');
    console.log('User:', response.data.displayName);
    console.log('Email:', response.data.emailAddress);
    return true;
    
  } catch (error) {
    console.log('❌ Failed!');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Data:', error.response?.data);
    console.log('Error message:', error.message);
    return false;
  }
}

/**
 * Run all JIRA connection tests
 */
async function runAllTests() {
  console.log('🧪 Running JIRA Connection Tests...\n');
  
  console.log('='.repeat(50));
  console.log('Test 1: JIRA API v2 with browser headers');
  console.log('='.repeat(50));
  const v2Result = await testJiraConnectionV2();
  
  console.log('\n' + '='.repeat(50));
  console.log('Test 2: JIRA API v3 with minimal headers');
  console.log('='.repeat(50));
  const v3Result = await testJiraConnectionV3();
  
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`API v2 Test: ${v2Result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`API v3 Test: ${v3Result ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (v3Result) {
    console.log('\n🎉 Recommended: Use API v3 for production integration');
  } else if (v2Result) {
    console.log('\n⚠️  API v2 works but consider upgrading to v3');
  } else {
    console.log('\n❌ Both tests failed - check credentials and network connectivity');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testJiraConnectionV2,
  testJiraConnectionV3,
  runAllTests
};
