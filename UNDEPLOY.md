# CAP JIRA Service - Undeploy Guide

This document provides step-by-step instructions to completely remove the CAP JIRA service and all its related resources from SAP BTP Cloud Foundry.

## Prerequisites

- CF CLI installed and configured
- Logged into the correct BTP space: `SANOFI_devs4coe / dev`
- Appropriate permissions to delete apps and services

## Current Deployed Resources

Based on the current deployment, the following resources need to be removed:

### Applications
- `cap-jira-srv` - Main CAP service application
- `cap-jira-db-deployer` - Database deployment application

### Services
- `cap-jira-db` - HANA HDI container (hdi-shared)
- `cap-jira-destination` - Destination service (lite)
- `cap-jira-xsuaa` - XSUAA authentication service (application)

## Undeploy Steps

### Step 1: Check Current Status

First, verify what's currently deployed:

```bash
# Check deployed applications
cf apps | grep cap-jira

# Check bound services
cf services | grep cap-jira

# Check specific app details
cf app cap-jira-srv
```

### Step 2: Stop Applications

Stop all running applications to prevent new connections:

```bash
# Stop the main service
cf stop cap-jira-srv

# Stop the db deployer (if running)
cf stop cap-jira-db-deployer
```

### Step 3: Delete Applications

Remove the applications from BTP:

```bash
# Delete the main service application
cf delete cap-jira-srv -f

# Delete the database deployer application
cf delete cap-jira-db-deployer -f
```

### Step 4: Unbind and Delete Services

Remove services in the correct order (apps first, then dependent services):

```bash
# Delete the HANA database service (this will also delete all data)
cf delete-service cap-jira-db -f

# Delete the destination service
cf delete-service cap-jira-destination -f

# Delete the XSUAA authentication service
cf delete-service cap-jira-xsuaa -f
```

### Step 5: Verify Cleanup

Confirm all resources have been removed:

```bash
# Verify no cap-jira apps remain
cf apps | grep cap-jira

# Verify no cap-jira services remain
cf services | grep cap-jira

# Should return no results if cleanup was successful
```

## Alternative: Using CAP CLI (if mta.yaml exists)

If you have the project source code and want to use CAP's built-in undeploy:

```bash
# Navigate to project directory
cd /path/to/cap-jira

# Undeploy using CAP CLI
cf undeploy cap-jira --delete-services
```

## Alternative: Using MTA Undeploy (if deployed via MTA)

If the application was deployed using Multi-Target Application (MTA):

```bash
# List deployed MTAs
cf mtas

# Undeploy the MTA (if cap-jira appears in the list)
cf undeploy cap-jira --delete-services
```

## Important Notes

⚠️ **Data Loss Warning**: Deleting the `cap-jira-db` service will permanently delete all data stored in the HANA database. Make sure to backup any important data before proceeding.

⚠️ **Service Dependencies**: Some services may have dependencies. If you encounter errors, try deleting in this order:
1. Applications first
2. XSUAA service
3. Destination service  
4. Database service last

⚠️ **Shared Services**: If any services are shared with other applications, you'll get an error. In that case, only unbind the service instead of deleting it:

```bash
# If service is shared, unbind instead of delete
cf unbind-service cap-jira-srv cap-jira-db
cf unbind-service cap-jira-srv cap-jira-destination
cf unbind-service cap-jira-srv cap-jira-xsuaa
```

## Troubleshooting

### Service Deletion Fails
If service deletion fails due to existing bindings:

```bash
# Check which apps are still bound
cf service cap-jira-db

# Unbind manually if needed
cf unbind-service <app-name> <service-name>
```

### Application Deletion Fails
If application deletion fails:

```bash
# Force stop first
cf stop cap-jira-srv

# Try delete with force flag
cf delete cap-jira-srv -f -r
```

### Verify Complete Cleanup
After cleanup, these commands should return no cap-jira related resources:

```bash
cf apps | grep cap-jira     # Should return nothing
cf services | grep cap-jira # Should return nothing
cf routes | grep cap-jira   # Should return nothing
```

## Re-deployment

If you need to deploy again later, you can use:

```bash
# Navigate to project directory
cd /path/to/cap-jira

# Build and deploy
cds build --production
cf deploy mta_archives/cap-jira_1.0.0.mtar
```

Or for development deployment:

```bash
cds deploy --to cloudfoundry
```

---

**Created**: September 5, 2025  
**Last Updated**: September 5, 2025  
**Version**: 1.0
