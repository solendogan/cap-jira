#!/bin/bash

# =============================================================================
# Local JIRA Development Test Script
# =============================================================================
# This script provides various testing utilities for local development
# Usage: ./local-test-runner.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Test functions
test_env_vars() {
    print_header "🔍 Environment Variables Check"
    
    if [ -f ".env" ]; then
        print_success ".env file found"
    else
        print_error ".env file not found"
        return 1
    fi
    
    local required_vars=("JIRA_BASE_URL" "JIRA_USERNAME" "JIRA_API_TOKEN")
    local missing_vars=()
    
    source .env
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        else
            print_success "$var is set"
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    print_success "All required environment variables are set"
}

test_jira_direct() {
    print_header "🌐 Direct JIRA API Test"
    
    source .env
    
    if [ -z "$JIRA_USERNAME" ] || [ -z "$JIRA_API_TOKEN" ]; then
        print_error "JIRA credentials not set"
        return 1
    fi
    
    echo "Testing direct connection to JIRA API..."
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
        "$JIRA_BASE_URL/rest/api/3/myself")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Direct JIRA API connection successful"
        echo "$body" | jq .displayName 2>/dev/null || echo "User info retrieved"
    else
        print_error "Direct JIRA API connection failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

test_cap_local() {
    print_header "🚀 Local CAP Service Test"
    
    local cap_url="http://localhost:4004"
    
    # Check if CAP is running
    if ! curl -s "$cap_url" > /dev/null; then
        print_error "CAP service not running at $cap_url"
        print_warning "Start with: npm run start-local"
        return 1
    fi
    
    print_success "CAP service is running"
    
    # Test endpoints
    local endpoints=(
        "/odata/v4/jira/testConnection"
        "/odata/v4/jira/getProjects"
        "/odata/v4/jira/\$metadata"
    )
    
    for endpoint in "${endpoints[@]}"; do
        echo "Testing: $endpoint"
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$cap_url$endpoint")
        http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        
        if [ "$http_code" -eq 200 ]; then
            print_success "✓ $endpoint"
        else
            print_error "✗ $endpoint (HTTP $http_code)"
        fi
    done
}

run_unit_tests() {
    print_header "🧪 Unit Tests"
    
    if [ -f "tests/unit/jira-connection.test.js" ]; then
        node tests/unit/jira-connection.test.js
    else
        print_error "Unit test file not found"
        return 1
    fi
}

show_help() {
    cat << EOF
🔧 Local JIRA Development Test Runner

Usage: $0 [command]

Commands:
    env         Check environment variables
    direct      Test direct JIRA API connection
    cap         Test local CAP service
    unit        Run unit tests
    all         Run all tests
    help        Show this help message

Examples:
    $0 env              # Check .env configuration
    $0 direct           # Test JIRA API directly
    $0 cap              # Test local CAP endpoints
    $0 all              # Run complete test suite

EOF
}

run_all_tests() {
    print_header "🎯 Running Complete Test Suite"
    
    local failed=0
    
    test_env_vars || failed=1
    echo ""
    
    test_jira_direct || failed=1
    echo ""
    
    run_unit_tests || failed=1
    echo ""
    
    test_cap_local || failed=1
    echo ""
    
    if [ $failed -eq 0 ]; then
        print_success "All tests passed! 🎉"
    else
        print_error "Some tests failed. Check output above for details."
        exit 1
    fi
}

# Main execution
case "${1:-help}" in
    env)
        test_env_vars
        ;;
    direct)
        test_jira_direct
        ;;
    cap)
        test_cap_local
        ;;
    unit)
        run_unit_tests
        ;;
    all)
        run_all_tests
        ;;
    help|*)
        show_help
        ;;
esac
