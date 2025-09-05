#!/bin/bash

# BTP OAuth Test Script
# Tests OAuth functionality in deployed BTP environment

set -e

echo "🔐 BTP OAuth Test for CAP JIRA Service"
echo "======================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# OAuth Configuration for BTP
TOKEN_URL='https://devs4coe.authentication.eu10.hana.ondemand.com/oauth/token'
CLIENT_ID='sb-cap-jira!t71444'
CLIENT_SECRET='16d59ab3-dfdb-44cc-8db0-e7704767bf8d$XwPbN-hqtISQ1czD6t9j0AqC3GM-B_21qGBftdRXKg8='
USERNAME='solen.dogan@sanofi.com'
PASSWORD='Taksim12'

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to get OAuth token
get_oauth_token() {
    print_status $BLUE "🔑 Getting OAuth token from BTP..."
    
    local token_response=$(curl -s -X POST "$TOKEN_URL" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=client_credentials" \
        -d "client_id=$CLIENT_ID" \
        -d "client_secret=$CLIENT_SECRET" \
        -d "username=$USERNAME" \
        -d "password=$PASSWORD")
    
    if [ $? -eq 0 ]; then
        local access_token=$(echo "$token_response" | jq -r '.access_token // empty' 2>/dev/null)
        
        if [ -n "$access_token" ] && [ "$access_token" != "null" ]; then
            print_status $GREEN "✅ OAuth token acquired successfully"
            echo "$access_token"
            return 0
        else
            print_status $RED "❌ Failed to extract access token from response"
            echo "Response: $token_response" >&2
            return 1
        fi
    else
        print_status $RED "❌ Failed to get OAuth token from $TOKEN_URL"
        return 1
    fi
}

# Check if we're logged into CF
check_cf_login() {
    print_status $BLUE "📡 Checking CF login status..."
    if ! cf target > /dev/null 2>&1; then
        print_status $RED "❌ Not logged into Cloud Foundry. Please run 'cf login' first."
        exit 1
    fi
    
    local org=$(cf target | grep org: | awk '{print $2}')
    local space=$(cf target | grep space: | awk '{print $2}')
    print_status $GREEN "✅ Logged into CF - Org: $org, Space: $space"
    echo
}

# Get the app URL
get_app_url() {
    print_status $BLUE "🔍 Getting cap-jira-srv URL..."
    local app_info=$(cf app cap-jira-srv)
    local app_url=$(echo "$app_info" | grep routes: | awk '{print $2}')
    if [ -z "$app_url" ]; then
        print_status $RED "❌ Could not find cap-jira-srv app URL"
        exit 1
    fi
    
    # Remove any trailing whitespace and ensure protocol
    app_url=$(echo "$app_url" | tr -d '\r\n' | sed 's/[[:space:]]*$//')
    echo "https://$app_url"
}

# Test OAuth endpoints
test_oauth_endpoint() {
    local base_url=$1
    local endpoint=$2
    local description=$3
    local token=$4
    
    print_status $BLUE "🌐 Testing $description..."
    echo "   URL: $base_url$endpoint"
    
    local auth_header=""
    if [ -n "$token" ]; then
        auth_header="Authorization: Bearer $token"
        echo "   Auth: Using OAuth Bearer token"
    else
        echo "   Auth: No authentication"
    fi
    
    local response
    if [ -n "$token" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "$auth_header" "$base_url$endpoint")
    else
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$base_url$endpoint")
    fi
    
    local body=$(echo "$response" | sed '$d')
    local status=$(echo "$response" | tail -n1 | sed 's/HTTP_STATUS://')
    
    echo "   Status: $status"
    
    if [ "$status" = "200" ]; then
        print_status $GREEN "   ✅ Success"
        if echo "$body" | jq . > /dev/null 2>&1; then
            echo "$body" | jq . | head -10
            if [ $(echo "$body" | jq . | wc -l) -gt 10 ]; then
                echo "   ... (truncated)"
            fi
        else
            echo "$body" | head -5
        fi
    elif [ "$status" = "401" ]; then
        print_status $YELLOW "   ⚠️  Authentication required"
        if [ -z "$token" ]; then
            echo "   (This is expected when testing without OAuth token)"
        else
            echo "   (OAuth token may be invalid or expired)"
        fi
    elif [ "$status" = "403" ]; then
        print_status $YELLOW "   ⚠️  Forbidden - Check OAuth scope/permissions"
    else
        print_status $RED "   ❌ Failed with status $status"
        echo "$body" | head -3
    fi
    echo
}

# Test destination service configuration
test_destination_service() {
    local base_url=$1
    local token=$2
    
    print_status $BLUE "🔧 Testing destination service integration..."
    
    # Check if destination service is bound
    print_status $BLUE "📋 Checking bound services..."
    cf services | grep cap-jira
    echo
    
    # Test the service endpoint that uses destination service
    test_oauth_endpoint "$base_url" "/odata/v4/jira/testConnection" "JIRA connection with destination service" "$token"
    local test_result=$?
    echo "Test result: $test_result"
}

# Test OAuth configuration
test_oauth_configuration() {
    local base_url=$1
    local token=$2
    
    print_status $BLUE "🔐 Testing OAuth configuration..."
    
    # Test service document (should work without auth due to @open annotation)
    test_oauth_endpoint "$base_url" "/odata/v4/jira" "Service document" ""
    
    # Test metadata (should work without auth due to @open annotation)
    test_oauth_endpoint "$base_url" "/odata/v4/jira/\$metadata" "Service metadata" ""
    
    # Test protected endpoints with OAuth token
    if [ -n "$token" ]; then
        print_status $BLUE "🔐 Testing protected endpoints with OAuth token..."
        test_oauth_endpoint "$base_url" "/odata/v4/jira/Projects" "Projects endpoint (with OAuth)" "$token"
        test_oauth_endpoint "$base_url" "/odata/v4/jira/getProjects" "Get Projects function (with OAuth)" "$token"
    else
        print_status $YELLOW "⚠️  Skipping OAuth-protected endpoint tests (no token available)"
        # Test without token to show authentication is required
        test_oauth_endpoint "$base_url" "/odata/v4/jira/Projects" "Projects endpoint (without auth)" ""
    fi
}

# Check app logs for OAuth-related messages
check_app_logs() {
    print_status $BLUE "📜 Checking recent application logs for OAuth activity..."
    
    echo "Looking for OAuth, destination, and authentication-related log entries:"
    cf logs cap-jira-srv --recent | grep -i -E "(oauth|destination|auth|token)" | tail -10 || {
        echo "No OAuth-related log entries found in recent logs."
    }
    echo
}

# Main test execution
main() {
    echo "This script tests OAuth functionality in the deployed BTP environment."
    echo "It will acquire an OAuth token and test the destination service integration."
    echo
    
    # Check prerequisites
    check_cf_login
    
    # Get app URL
    local base_url=$(get_app_url)
    print_status $GREEN "🎯 Base URL: $base_url"
    echo
    
    # Get OAuth token
    local oauth_token=""
    print_status $BLUE "🔑 Attempting to acquire OAuth token..."
    if oauth_token=$(get_oauth_token); then
        print_status $GREEN "✅ OAuth token acquired successfully"
        echo "Token preview: ${oauth_token:0:20}..."
        echo
    else
        print_status $YELLOW "⚠️  Failed to acquire OAuth token, proceeding with unauthenticated tests"
        echo "This will show that authentication is properly required."
        echo
    fi
    
    # Run tests
    test_destination_service "$base_url" "$oauth_token"
    test_oauth_configuration "$base_url" "$oauth_token"
    check_app_logs
    
    print_status $BLUE "📝 OAuth Test Summary:"
    echo "=============================="
    if [ -n "$oauth_token" ]; then
        echo "✅ OAuth token was acquired and used for testing"
        echo "✅ Check the test results above to see if authenticated requests succeeded"
    else
        echo "⚠️  OAuth token acquisition failed - check credentials and token endpoint"
    fi
    echo "1. If testConnection returns success with OAuth, your destination is configured correctly"
    echo "2. If you see 401/403 errors, check your destination service OAuth configuration in BTP Cockpit"
    echo "3. Look for 'OAuth authentication via destination service' in the logs"
    echo "4. Ensure your JIRA destination uses OAuth2ClientCredentials or similar OAuth flow"
    echo
    print_status $GREEN "✅ BTP OAuth test completed!"
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0"
    echo
    echo "This script tests OAuth functionality in the BTP-deployed CAP JIRA service."
    echo "Prerequisites:"
    echo "  - cf CLI installed and logged in"
    echo "  - cap-jira-srv deployed to BTP"
    echo "  - jq installed (optional, for JSON formatting)"
    echo
    exit 0
fi

# Execute main function
main
