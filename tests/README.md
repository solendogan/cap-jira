# JIRA Integration Tests

This directory contains comprehensive test suites for the CAP JIRA integration service.

## Directory Structure

```
tests/
├── README.md                           # This file
├── unit/                              # Unit tests
│   └── jira-connection.test.js        # JIRA API connection tests
├── integration/                       # Integration tests
│   └── test-jira-integration.sh       # End-to-end BTP deployment tests
└── scripts/                          # Test utilities
    └── local-test-runner.sh           # Local development test runner
```

## Test Categories

### 🧪 Unit Tests (`tests/unit/`)

Unit tests for individual components and functions.

#### `jira-connection.test.js`
- Tests JIRA API connectivity with different configurations
- Compares API v2 vs v3 performance
- Validates authentication and header configurations
- Can be run independently or as part of test suite

**Usage:**
```bash
# Run unit tests directly
node tests/unit/jira-connection.test.js

# Or via npm script (if configured)
npm test
```

### 🔗 Integration Tests (`tests/integration/`)

End-to-end tests for deployed services and complete workflows.

#### `test-jira-integration.sh`
- Tests deployed CAP service on BTP Cloud Foundry
- Validates all OData endpoints
- Checks destination service integration
- Provides detailed error reporting and troubleshooting tips

**Usage:**
```bash
# Make script executable
chmod +x tests/integration/test-jira-integration.sh

# Run integration tests
./tests/integration/test-jira-integration.sh
```

**Test Coverage:**
- ✅ JIRA connection endpoint (`/odata/v4/jira/testConnection`)
- ✅ Projects retrieval (`/odata/v4/jira/getProjects`)
- ✅ ABAP issues query (`/odata/v4/jira/getAbapOpenIssues`)
- ✅ OData service metadata (`/odata/v4/jira/$metadata`)

### 🛠️ Test Scripts (`tests/scripts/`)

Utility scripts for development and testing workflows.

#### `local-test-runner.sh`
- Comprehensive local development test runner
- Environment validation
- Direct JIRA API testing
- Local CAP service validation
- Combined test execution

**Usage:**
```bash
# Make script executable
chmod +x tests/scripts/local-test-runner.sh

# Check environment variables
./tests/scripts/local-test-runner.sh env

# Test direct JIRA API connection
./tests/scripts/local-test-runner.sh direct

# Test local CAP service
./tests/scripts/local-test-runner.sh cap

# Run unit tests
./tests/scripts/local-test-runner.sh unit

# Run all tests
./tests/scripts/local-test-runner.sh all

# Show help
./tests/scripts/local-test-runner.sh help
```

## Prerequisites

### Environment Setup
1. **Environment Variables**: Ensure `.env` file is configured with:
   ```
   JIRA_BASE_URL=https://sanofi.atlassian.net
   JIRA_USERNAME=your.email@sanofi.com
   JIRA_API_TOKEN=your_api_token
   ```

2. **Dependencies**: Install required tools:
   ```bash
   # For JSON parsing (optional but recommended)
   brew install jq  # macOS
   # or
   sudo apt-get install jq  # Ubuntu/Debian
   ```

### Local Development
1. **Start CAP Service**:
   ```bash
   npm run start-local
   ```

2. **Verify Service**: Check that `http://localhost:4004` is accessible

### BTP Deployment
1. **Deploy Application**:
   ```bash
   mbt build -e prod.mtaext
   cf deploy mta_archives/cap-jira_1.0.0.mtar
   ```

2. **Configure Destination**: Set up JIRA credentials in BTP Cockpit

## Test Execution Workflows

### 🚀 Quick Development Cycle
```bash
# 1. Check environment
./tests/scripts/local-test-runner.sh env

# 2. Test JIRA API directly
./tests/scripts/local-test-runner.sh direct

# 3. Start CAP service
npm run start-local

# 4. Test CAP endpoints
./tests/scripts/local-test-runner.sh cap
```

### 🏗️ Pre-Deployment Validation
```bash
# Run all local tests
./tests/scripts/local-test-runner.sh all

# Build and deploy
mbt build -e prod.mtaext
cf deploy mta_archives/cap-jira_1.0.0.mtar

# Test deployed service
./tests/integration/test-jira-integration.sh
```

### 🔍 Debugging Failed Tests

#### Local Connection Issues
1. **Check Environment Variables**:
   ```bash
   ./tests/scripts/local-test-runner.sh env
   ```

2. **Test Direct JIRA API**:
   ```bash
   ./tests/scripts/local-test-runner.sh direct
   ```

3. **Verify CAP Service**:
   ```bash
   curl http://localhost:4004/odata/v4/jira/$metadata
   ```

#### BTP Deployment Issues
1. **Check Application Status**:
   ```bash
   cf apps
   cf logs cap-jira-srv --recent
   ```

2. **Verify Destination Configuration**:
   - BTP Cockpit → Connectivity → Destinations → jira
   - Check URL, authentication, and credentials

3. **Test Service Endpoints**:
   ```bash
   ./tests/integration/test-jira-integration.sh
   ```

## Continuous Integration

### GitHub Actions (Example)
```yaml
# .github/workflows/test.yml
name: JIRA Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: node tests/unit/jira-connection.test.js
        env:
          JIRA_BASE_URL: ${{ secrets.JIRA_BASE_URL }}
          JIRA_USERNAME: ${{ secrets.JIRA_USERNAME }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
```

## Contributing

When adding new tests:

1. **Unit Tests**: Add to `tests/unit/` with descriptive filenames
2. **Integration Tests**: Add to `tests/integration/` for end-to-end scenarios
3. **Utilities**: Add helper scripts to `tests/scripts/`
4. **Documentation**: Update this README with new test descriptions

### Test Naming Conventions
- Unit tests: `*.test.js`
- Integration tests: `test-*.sh` or `*.integration.test.js`
- Utility scripts: `*-runner.sh` or `*-helper.sh`

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loaded**:
   - Ensure `.env` file exists in project root
   - Check file permissions and format

2. **JIRA API Authentication Failures**:
   - Verify API token is current and valid
   - Check username format (email for Atlassian Cloud)
   - Test credentials with direct curl command

3. **Network/Firewall Issues**:
   - Corporate networks may block outbound HTTPS
   - Test from different network if needed
   - Check proxy configuration

4. **BTP Deployment Issues**:
   - Verify destination service configuration
   - Check application logs for detailed errors
   - Ensure XSUAA authentication is properly configured

### Getting Help

1. **Check Application Logs**:
   ```bash
   cf logs cap-jira-srv --recent
   ```

2. **Verify Service Health**:
   ```bash
   cf apps | grep cap-jira
   ```

3. **Test Destination Configuration**:
   - BTP Cockpit → Connectivity → Destinations
   - Test connection from BTP console

---

For more information, see the main project [README.md](../README.md) and [JIRA-DESTINATION-SETUP.md](../JIRA-DESTINATION-SETUP.md).
