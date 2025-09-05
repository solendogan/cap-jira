#!/bin/bash

# Simple script to debug BTP URL extraction
echo "🔍 Debugging BTP URL extraction..."

# Check if CF is available
if ! command -v cf &> /dev/null; then
    echo "❌ CF CLI not found"
    exit 1
fi

# Check CF login
if ! cf target > /dev/null 2>&1; then
    echo "❌ Not logged into CF"
    exit 1
fi

echo "✅ CF CLI available and logged in"

# Get app info
echo "📱 Getting app info..."
cf app cap-jira-srv

echo ""
echo "🔧 Extracting URL..."
APP_INFO=$(cf app cap-jira-srv)
echo "Raw app info lines with 'routes:':"
echo "$APP_INFO" | grep routes:

echo ""
echo "Extracted URL parts:"
URL_PART=$(echo "$APP_INFO" | grep routes: | awk '{print $2}')
echo "URL part: '$URL_PART'"
echo "URL part length: ${#URL_PART}"

# Clean URL
CLEAN_URL=$(echo "$URL_PART" | tr -d '\r\n' | sed 's/[[:space:]]*$//')
echo "Clean URL: '$CLEAN_URL'"
echo "Clean URL length: ${#CLEAN_URL}"

FULL_URL="https://$CLEAN_URL"
echo "Full URL: '$FULL_URL'"

# Test URL
echo ""
echo "🌐 Testing URL accessibility..."
curl -s -I "$FULL_URL" | head -1
