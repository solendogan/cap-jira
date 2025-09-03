const axios = require('axios');

async function testJiraConnection() {
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

  console.log('Testing connection with config:', {
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

// Load environment variables
require('dotenv').config();

testJiraConnection();
