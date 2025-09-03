# CAP JIRA Integration

A SAP Cloud Application Programming Model (CAP) service for integrating with JIRA REST API.

## Features

- **JIRA API Integration**: Connect to JIRA Cloud or Server instances
- **Issue Management**: Read, create, and update JIRA issues
- **Project Management**: Fetch JIRA projects and metadata  
- **User Management**: Retrieve JIRA user information
- **Caching**: Local caching of JIRA data for performance
- **Search**: Advanced JQL-based issue searching

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure JIRA connection**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your JIRA details:
   - `JIRA_BASE_URL`: Your JIRA instance URL (e.g., https://yourcompany.atlassian.net)
   - `JIRA_USERNAME`: Your JIRA email address
   - `JIRA_API_TOKEN`: Your JIRA API token ([create one here](https://id.atlassian.com/manage-profile/security/api-tokens))

3. **Start the service**:
   ```bash
   npm start
   ```

## API Endpoints

### Service Actions

- `POST /jira/syncIssues` - Sync recent issues from JIRA
- `POST /jira/getIssueByKey` - Get specific issue by JIRA key
- `POST /jira/searchIssues` - Search issues using JQL
- `POST /jira/createIssue` - Create new JIRA issue
- `POST /jira/updateIssue` - Update existing JIRA issue
- `GET /jira/testConnection` - Test JIRA API connection
- `GET /jira/getProjects` - Get all JIRA projects

### OData Entities

- `GET /jira/Issues` - Browse cached issues
- `GET /jira/Projects` - Browse JIRA projects  
- `GET /jira/Users` - Browse JIRA users
- `GET /jira/IssueCache` - Manage cached issue data
- `GET /jira/ApiConfig` - Manage API configurations

## Usage Examples

### Test Connection
```bash
curl -X GET http://localhost:4004/jira/testConnection
```

### Search Issues
```bash
curl -X POST http://localhost:4004/jira/searchIssues \
  -H "Content-Type: application/json" \
  -d '{"jql": "project = MYPROJECT AND status = Open"}'
```

### Create Issue
```bash
curl -X POST http://localhost:4004/jira/createIssue \
  -H "Content-Type: application/json" \
  -d '{
    "projectKey": "MYPROJECT",
    "summary": "New issue from CAP service",
    "description": "This issue was created via the CAP JIRA integration",
    "issueType": "Task"
  }'
```

## Development

- **Watch mode**: `cds watch`
- **Deploy to HANA**: Configure HANA credentials and run `cds deploy --to hana`
- **Build for production**: `cds build`

## Security Notes

- Store API tokens securely (use environment variables or SAP BTP destination service)
- Implement proper authentication/authorization for production use
- Consider rate limiting for JIRA API calls

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).


## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.

# SAP BTP Deployment Guide for CAP JIRA Service

## Prerequisites

1. **SAP BTP Account**: Access to SAP BTP with Cloud Foundry environment
2. **Cloud Foundry CLI**: Install cf CLI tool
3. **MTA Build Tool**: Install mta command-line tool
4. **Node.js**: Version 18 or higher

## Installation Steps

### 1. Install Required Tools

```bash
# Install Cloud Foundry CLI
brew install cloudfoundry/tap/cf-cli@8

# Install MTA Build Tool
npm install -g mbt

# Verify installations
cf --version
mbt --version
```

### 2. Login to SAP BTP

```bash
# Login to Cloud Foundry
cf login -a <your-api-endpoint>

# Example for EU10 region
cf login -a https://api.cf.eu10.hana.ondemand.com

# Set target organization and space
cf target -o <your-org> -s <your-space>
```

### 3. Build the MTA Archive

```bash
# Navigate to project root
cd /Users/u1021480/sanofi_sandbox/tor_projects/cap-jira

# Build MTA archive
mbt build

# This creates a mta_archives folder with the .mtar file
```

### 4. Deploy to BTP

```bash
# Deploy the MTA archive
cf deploy mta_archives/cap-jira_1.0.0.mtar

# Monitor deployment status
cf apps
cf services
```

## Post-Deployment Configuration

### 1. Configure Destination Service

After deployment, configure the JIRA destination in BTP Cockpit:

1. Navigate to **Connectivity** → **Destinations**
2. Create new destination with these properties:

```
Name: JIRA_API
Type: HTTP
URL: https://sanofi.atlassian.net
Proxy Type: Internet
Authentication: BasicAuthentication
User: <your-jira-email>
Password: <your-jira-api-token>

Additional Properties:
HTML5.DynamicDestination: true
HTML5.Timeout: 30000
```

### 2. Configure Environment Variables

Set environment variables for the application:

```bash
# Set environment variables
cf set-env cap-jira-srv JIRA_BASE_URL "https://sanofi.atlassian.net"
cf set-env cap-jira-srv JIRA_USERNAME "<your-jira-email>"
cf set-env cap-jira-srv JIRA_API_TOKEN "<your-jira-api-token>"

# Restart the application
cf restart cap-jira-srv
```

### 3. Bind Services (if not auto-bound)

```bash
# Bind HANA service
cf bind-service cap-jira-srv cap-jira-db

# Bind XSUAA service
cf bind-service cap-jira-srv cap-jira-xsuaa

# Bind Destination service
cf bind-service cap-jira-srv cap-jira-destination

# Restage application
cf restage cap-jira-srv
```

## Testing the Deployment

### 1. Check Application Status

```bash
# Check application status
cf apps

# Check logs
cf logs cap-jira-srv --recent

# Check service bindings
cf env cap-jira-srv
```

### 2. Test API Endpoints

```bash
# Get application URL
cf apps

# Test service endpoints
curl -X GET "<app-url>/jira/testConnection"
curl -X GET "<app-url>/jira/Projects"
```

### 3. Access Service UI

Navigate to the application URL in browser:
- Service UI: `<app-url>/jira/$metadata`
- Health Check: `<app-url>/jira/testConnection`

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   ```bash
   # Check deployment logs
   cf logs cap-jira-srv --recent
   
   # Check service status
   cf services
   ```

2. **Service Binding Issues**
   ```bash
   # Check environment variables
   cf env cap-jira-srv
   
   # Rebind services
   cf unbind-service cap-jira-srv <service-name>
   cf bind-service cap-jira-srv <service-name>
   ```

3. **JIRA API Connection Issues**
   - Verify destination configuration in BTP Cockpit
   - Check JIRA credentials and API token
   - Ensure network connectivity from BTP to JIRA

### Debug Commands

```bash
# Check application details
cf app cap-jira-srv

# Check recent logs
cf logs cap-jira-srv --recent

# Stream live logs
cf logs cap-jira-srv

# Check service instances
cf services

# Check routes
cf routes
```

## Security Configuration

### 1. XSUAA Setup

The `xs-security.json` file configures authentication and authorization:

- **Scopes**: Define permissions for API access
- **Role Collections**: Group related roles
- **Role Templates**: Define user roles

### 2. User Management

1. In BTP Cockpit, navigate to **Security** → **Users**
2. Assign role collections to users:
   - `JiraViewer`: Read-only access
   - `JiraUser`: Full access to JIRA operations

## Monitoring and Maintenance

### 1. Application Monitoring

```bash
# Check application health
cf app cap-jira-srv

# Monitor resource usage
cf app cap-jira-srv --guid
cf curl /v3/apps/<app-guid>/stats
```

### 2. Log Analysis

```bash
# Download recent logs
cf logs cap-jira-srv --recent > app-logs.txt

# Monitor specific log patterns
cf logs cap-jira-srv | grep -i error
```

### 3. Scaling

```bash
# Scale application instances
cf scale cap-jira-srv -i 2

# Scale memory
cf scale cap-jira-srv -m 1G

# Scale disk
cf scale cap-jira-srv -k 2G
```

## Environment-Specific Configurations

### Development Environment
- Use SQLite database
- Local environment variables
- Mock JIRA responses for testing

### Production Environment
- HANA database with persistence
- BTP Destination service for secure API access
- Comprehensive logging and monitoring

## Useful Commands Reference

```bash
# MTA Commands
mbt build                           # Build MTA archive
mbt module-build                    # Build specific module

# CF Commands
cf push                             # Deploy single application
cf deploy <mtar-file>              # Deploy MTA archive
cf apps                            # List applications
cf services                        # List services
cf marketplace                     # List available services
cf create-service                  # Create service instance
cf bind-service                    # Bind service to app
cf env <app-name>                  # Show environment variables
cf set-env <app-name> <key> <val>  # Set environment variable
cf logs <app-name>                 # Show application logs
cf restart <app-name>              # Restart application
cf restage <app-name>              # Restage application
```

## Next Steps

1. **CI/CD Integration**: Set up automated deployment pipeline
2. **API Testing**: Implement comprehensive test suite
3. **Performance Optimization**: Monitor and optimize API response times
4. **Error Handling**: Implement robust error handling and logging
5. **Documentation**: Create API documentation using OpenAPI/Swagger

