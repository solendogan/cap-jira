#!/usr/bin/env node

/**
 * OAuth Test Script for JIRA Client
 * This script tests the OAuth functionality by simulating BTP environment
 */

const JiraClient = require('../../srv/jira-client');

// Mock destination service response for OAuth testing
const mockDestinationService = {
  async getDestination(name) {
    console.log(`📡 Mock: Getting destination '${name}'`);
    
    // Simulate OAuth destination configuration
    return {
      destinationConfiguration: {
        URL: "https://sanofi.atlassian.net",
        Authentication: "OAuth2ClientCredentials",
        tokenServiceURL: "https://auth.atlassian.com/oauth/token",
        clientId: "mock-client-id"
      },
      authTokens: [
        {
          type: "Bearer",
          value: "mock-oauth-token-12345",
          expiresIn: "3600"
        }
      ]
    };
  }
};

// Mock CDS environment for OAuth testing
const mockCds = {
  env: {
    requires: {
      destination: true
    }
  },
  connect: {
    to: (service) => {
      if (service === 'destination') {
        return mockDestinationService;
      }
      throw new Error(`Unknown service: ${service}`);
    }
  }
};

async function testOAuthFlow() {
  console.log("🔐 Testing OAuth Flow for JIRA Client");
  console.log("=====================================\n");

  try {
    // Override environment variables for OAuth testing
    process.env.USE_DESTINATION = "true";
    process.env.NODE_ENV = "production";
    process.env.JIRA_DESTINATION_NAME = "jira";

    // Mock the CDS module temporarily
    const originalCds = require.cache[require.resolve('@sap/cds')];
    require.cache[require.resolve('@sap/cds')] = { exports: mockCds };

    console.log("✅ Environment setup:");
    console.log(`   USE_DESTINATION: ${process.env.USE_DESTINATION}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   JIRA_DESTINATION_NAME: ${process.env.JIRA_DESTINATION_NAME}\n`);

    // Create JIRA client instance
    console.log("🔧 Creating JIRA Client with OAuth...");
    const jiraClient = new JiraClient();

    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log("✅ JIRA Client created successfully\n");

    // Test the connection
    console.log("🌐 Testing JIRA connection...");
    
    // Mock axios for this test
    const originalAxios = require('axios');
    const mockAxios = {
      create: (config) => {
        console.log("📦 Axios instance created with config:", {
          baseURL: config.baseURL,
          timeout: config.timeout,
          headers: Object.keys(config.headers || {})
        });
        
        return {
          get: async (url) => {
            console.log(`🚀 Mock GET request to: ${url}`);
            console.log("🔑 Authorization header will be set by interceptor");
            
            // Simulate successful JIRA response
            return {
              data: {
                displayName: "Test User (OAuth)",
                emailAddress: "test.user@sanofi.com",
                accountId: "oauth-test-account-123"
              }
            };
          },
          interceptors: {
            request: {
              use: (interceptor) => {
                console.log("🛡️  OAuth interceptor registered successfully");
                
                // Test the interceptor
                const mockConfig = {
                  headers: {}
                };
                
                interceptor(mockConfig).then(config => {
                  console.log("✅ Interceptor processed request:", {
                    authHeader: config.headers.Authorization ? "Bearer [token]" : "No auth header"
                  });
                }).catch(err => {
                  console.log("❌ Interceptor error:", err.message);
                });
              }
            }
          }
        };
      }
    };

    // Override axios temporarily
    require.cache[require.resolve('axios')] = { exports: mockAxios };

    // Re-initialize the client to use mocked axios
    await jiraClient.initializeClient();

    // Test connection
    const result = await jiraClient.testConnection();

    console.log("\n📊 Test Results:");
    console.log("================");
    console.log(`Success: ${result.success}`);
    console.log(`User: ${result.user || 'N/A'}`);
    console.log(`Email: ${result.email || 'N/A'}`);
    console.log(`Destination Used: ${result.destinationUsed}`);
    console.log(`Destination Name: ${result.destinationName}`);

    if (result.success) {
      console.log("\n🎉 OAuth test completed successfully!");
      console.log("The OAuth flow would work in BTP environment.");
    } else {
      console.log("\n❌ OAuth test failed:");
      console.log(`Error: ${result.error}`);
    }

    // Restore original modules
    if (originalCds) {
      require.cache[require.resolve('@sap/cds')] = originalCds;
    }
    require.cache[require.resolve('axios')] = { exports: originalAxios };

  } catch (error) {
    console.error("\n💥 Test failed with error:");
    console.error(error.message);
    console.error(error.stack);
  }
}

async function testEnvironmentDetection() {
  console.log("\n🔍 Testing Environment Detection");
  console.log("=================================\n");

  const testCases = [
    {
      name: "Local Development",
      env: { USE_DESTINATION: "false", NODE_ENV: "development" },
      expected: "Environment variables"
    },
    {
      name: "BTP Production",
      env: { USE_DESTINATION: "true", NODE_ENV: "production" },
      expected: "OAuth via destination service"
    },
    {
      name: "Auto-detect Production",
      env: { NODE_ENV: "production" },
      expected: "OAuth via destination service"
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Test Case: ${testCase.name}`);
    
    // Set environment
    Object.keys(testCase.env).forEach(key => {
      process.env[key] = testCase.env[key];
    });

    const client = new JiraClient();
    
    console.log(`   USE_DESTINATION: ${process.env.USE_DESTINATION || 'undefined'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   useDestination: ${client.useDestination}`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log("");
  }
}

// Run tests
async function runAllTests() {
  console.log("🧪 JIRA OAuth Testing Suite");
  console.log("===========================\n");

  await testEnvironmentDetection();
  await testOAuthFlow();

  console.log("\n✨ All tests completed!");
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testOAuthFlow, testEnvironmentDetection };
