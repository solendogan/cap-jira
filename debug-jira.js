const axios = require('axios');
require('dotenv').config();

async function testJiraConnection() {
  try {
    console.log('Testing JIRA connection with minimal headers...');
    
    const auth = Buffer.from(`${process.env.JIRA_USERNAME}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    const config = {
      method: 'GET',
      url: 'https://sanofi.atlassian.net/rest/api/3/myself',
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
    
  } catch (error) {
    console.log('❌ Failed!');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Data:', error.response?.data);
    console.log('Error message:', error.message);
  }
}

testJiraConnection();
