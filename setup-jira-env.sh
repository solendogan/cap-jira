#!/bin/bash

# Quick Setup Script for JIRA Environment Variables
# Usage: ./setup-jira-env.sh your.email@sanofi.com your_jira_api_token

if [ $# -ne 2 ]; then
    echo "❌ Usage: $0 <your_email@sanofi.com> <your_jira_api_token>"
    echo ""
    echo "🔑 To get your JIRA API token:"
    echo "   1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens"
    echo "   2. Create API token with label: BTP-CAP-Integration"
    echo "   3. Copy the generated token"
    echo ""
    echo "📝 Example:"
    echo "   $0 john.doe@sanofi.com abcd1234efgh5678ijkl"
    exit 1
fi

JIRA_EMAIL="$1"
JIRA_TOKEN="$2"

echo "🔧 Setting up JIRA environment variables..."
echo "📧 Email: $JIRA_EMAIL"
echo "🔑 Token: ${JIRA_TOKEN:0:8}..."
echo ""

echo "1️⃣ Setting JIRA_USERNAME..."
cf set-env cap-jira-srv JIRA_USERNAME "$JIRA_EMAIL"

echo "2️⃣ Setting JIRA_API_TOKEN..."
cf set-env cap-jira-srv JIRA_API_TOKEN "$JIRA_TOKEN"

echo "3️⃣ Setting JIRA_BASE_URL..."
cf set-env cap-jira-srv JIRA_BASE_URL "https://sanofi.atlassian.net"

echo "4️⃣ Restarting application..."
cf restart cap-jira-srv

echo ""
echo "✅ Setup completed!"
echo ""
echo "🧪 Now test the connection:"
echo "   ./test-jira-connection.sh"
