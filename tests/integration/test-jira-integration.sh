#!/bin/bash

# =============================================================================
# JIRA Integration Test Script
# =============================================================================
# This script tests the deployed CAP JIRA service endpoints via BTP
# Usage: ./test-jira-integration.sh

set -e  # Exit on any error

# Configuration
APP_URL="https://sanofi-devs4coe-dev-cap-jira-srv.cfapps.eu10.hana.ondemand.com"
DESTINATION_NAME="jira"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

test_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo ""
    print_header "Testing $description..."
    echo "📡 Endpoint: $APP_URL$endpoint"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$APP_URL$endpoint" \
        -H "Accept: application/json" \
        -H "Content-Type: application/json")
    
    # Extract HTTP status code
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        print_success "HTTP $http_code - $description successful"
        if [ "$http_code" -eq 200 ] && [ -n "$body" ]; then
            echo "$body" | jq . 2>/dev/null || echo "$body"
        fi
        return 0
    else
        print_error "HTTP $http_code - $description failed"
        if [ -n "$body" ]; then
            echo "$body" | jq . 2>/dev/null || echo "$body"
        fi
        return 1
    fi
}

# Main test execution
main() {
    print_header "🔍 JIRA Integration Test Suite"
    echo "📡 App URL: $APP_URL"
    echo "🎯 Using destination: '$DESTINATION_NAME'"
    echo "⏰ Started at: $(date)"
    
    # Test results tracking
    local total_tests=0
    local passed_tests=0
    
    # Test 1: Connection endpoint
    total_tests=$((total_tests + 1))
    if test_endpoint "/odata/v4/jira/testConnection" "JIRA Connection Test"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Test 2: Projects endpoint
    total_tests=$((total_tests + 1))
    if test_endpoint "/odata/v4/jira/getProjects" "JIRA Projects Retrieval"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Test 3: ABAP Issues endpoint
    total_tests=$((total_tests + 1))
    if test_endpoint "/odata/v4/jira/getAbapOpenIssues" "ABAP Open Issues Query"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Test 4: Service metadata (should always work)
    total_tests=$((total_tests + 1))
    if test_endpoint "/odata/v4/jira/\$metadata" "OData Service Metadata"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Summary
    echo ""
    print_header "📊 TEST SUMMARY"
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $((total_tests - passed_tests))"
    echo "Success Rate: $(( passed_tests * 100 / total_tests ))%"
    echo "⏰ Completed at: $(date)"
    
    if [ "$passed_tests" -eq "$total_tests" ]; then
        print_success "All tests passed! 🎉"
        exit 0
    else
        print_warning "Some tests failed. Check the output above for details."
        echo ""
        print_header "💡 TROUBLESHOOTING TIPS:"
        echo "   - Check JIRA credentials in BTP Cockpit → Destinations → $DESTINATION_NAME"
        echo "   - Verify API token is valid and not expired"
        echo "   - Ensure user has access to Sanofi JIRA instance"
        echo "   - Confirm destination name matches: '$DESTINATION_NAME'"
        echo "   - Check application logs: cf logs cap-jira-srv --recent"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed - JSON output will not be formatted"
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    main "$@"
fi
