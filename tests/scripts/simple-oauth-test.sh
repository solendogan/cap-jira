#!/bin/bash

# Simple OAuth Test for BTP
echo "🔐 Testing OAuth with BTP CAP JIRA Service"
echo "=========================================="

# OAuth Configuration
TOKEN_URL='https://devs4coe.authentication.eu10.hana.ondemand.com/oauth/token'
CLIENT_ID='sb-cap-jira!t71444'
CLIENT_SECRET='16d59ab3-dfdb-44cc-8db0-e7704767bf8d$XwPbN-hqtISQ1czD6t9j0AqC3GM-B_21qGBftdRXKg8='
USERNAME='solen.dogan@sanofi.com'
PASSWORD='Taksim12'
BASE_URL='https://sanofi-devs4coe-dev-cap-jira-srv.cfapps.eu10.hana.ondemand.com'

echo "1. Acquiring OAuth token..."
TOKEN_RESPONSE=$(curl -s -X POST "$TOKEN_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "username=$USERNAME" \
  -d "password=$PASSWORD")

echo "Token response: $TOKEN_RESPONSE"

if command -v jq >/dev/null 2>&1; then
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
else
  # Fallback without jq
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
fi

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
  echo "✅ OAuth token acquired: ${ACCESS_TOKEN:0:20}..."
  
  echo ""
  echo "2. Testing authenticated request to testConnection..."
  curl -X GET "$BASE_URL/odata/v4/jira/testConnection" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" \
    -w "\nHTTP Status: %{http_code}\n"
    
  echo ""
  echo "3. Testing authenticated request to Projects..."
  curl -X GET "$BASE_URL/odata/v4/jira/Projects" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json" \
    -w "\nHTTP Status: %{http_code}\n"
    
else
  echo "❌ Failed to acquire OAuth token"
  echo "Response: $TOKEN_RESPONSE"
fi
