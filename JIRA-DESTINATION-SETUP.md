# JIRA Destination Configuration Guide

## Current Setup
Your CAP JIRA application is now deployed and configured to use destinations through the `cap-jira-destination` service.

## Option 1: Use Existing JIRA Destination via Service Key

If you have an existing `jira` destination in another destination service, you can:

1. **Export the destination configuration**:
   - In BTP Cockpit → Connectivity → Destinations
   - Find your existing `jira` destination
   - Note down its configuration (URL, Authentication type, User, etc.)

2. **Import to cap-jira-destination service**:
   - Access the `cap-jira-destination` service in BTP Cockpit
   - Add a new destination named `jira` with the same configuration

## Option 2: Configure JIRA Destination Directly

1. **Access BTP Cockpit**
   - URL: https://cockpit.eu10.hana.ondemand.com
   - Navigate to: SANOFI_devs4coe subaccount

2. **Go to Service Instances**
   - Click **Services** → **Instances**
   - Find `cap-jira-destination`
   - Click on it to manage

3. **Configure Destinations**
   - In the service instance details
   - Go to **Destinations** tab
   - Add a new destination with these settings:

```
Name: jira
Description: JIRA API Connection
URL: https://sanofi.atlassian.net
Type: HTTP
Proxy Type: Internet
Authentication: BasicAuthentication
User: [YOUR_SANOFI_EMAIL]
Password: [YOUR_JIRA_API_TOKEN]
```

**Additional Properties:**
```
HTML5.DynamicDestination = true
WebIDEEnabled = true
TrustAll = false
```

## Get Your JIRA API Token

1. **Go to Atlassian Account Settings**
   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Login with your Sanofi credentials

2. **Create API Token**
   - Click **"Create API token"**
   - Label: `BTP-CAP-Integration`
   - Copy the generated token

## Test the Configuration

Run the test script to verify everything works:

```bash
./test-jira-connection.sh
```

## Application URLs

- **Application**: https://sanofi-devs4coe-dev-cap-jira-srv.cfapps.eu10.hana.ondemand.com
- **OData Service**: https://sanofi-devs4coe-dev-cap-jira-srv.cfapps.eu10.hana.ondemand.com/odata/v4/jira
- **Test Connection**: https://sanofi-devs4coe-dev-cap-jira-srv.cfapps.eu10.hana.ondemand.com/odata/v4/jira/testConnection

## Troubleshooting

If you see errors:
1. **Check destination name**: Ensure it's named exactly `jira`
2. **Verify credentials**: API token must be valid and not expired
3. **Check permissions**: Your JIRA user must have appropriate permissions
4. **Test manually**: Try the JIRA API directly with your credentials

## Current Configuration

- **Environment**: Production (NODE_ENV=production)
- **Destination Service**: cap-jira-destination
- **Expected Destination Name**: jira
- **JIRA Base URL**: https://sanofi.atlassian.net
- **API Version**: v3 (REST API 3.0)
