# MTA Extension Files Usage Guide

## Overview
MTA extension files (`.mtaext`) allow you to override or extend the configuration defined in your main `mta.yaml` file for different environments without modifying the base configuration.

## Available Extension Files

### 1. `dev.mtaext` - Development Environment
- Sets `NODE_ENV=development`
- Disables destination service for local development
- Creates `jira-api-dev` destination
- Enables debug logging

### 2. `prod.mtaext` - Production Environment
- Sets `NODE_ENV=production`
- Enables destination service
- Scales to 2 instances with 1GB memory
- Creates `jira-api-prod` destination
- Uses standard service plans

## Deployment Commands

### Build with Extension Files

#### Development Deployment
```bash
# Build for development
mbt build -e dev.mtaext

# Deploy to development space
cf deploy mta_archives/cap-jira_1.0.0.mtar
```

#### Production Deployment
```bash
# Build for production
mbt build -e prod.mtaext

# Deploy to production space
cf deploy mta_archives/cap-jira_1.0.0.mtar
```

### Multiple Extension Files
```bash
# Use multiple extension files (they are applied in order)
mbt build -e dev.mtaext -e custom.mtaext
```

## Environment-Specific Configuration

### Development
- Uses local JIRA configuration (fallback)
- Single instance, lower memory
- Debug logging enabled
- Development destination name

### Production
- Uses BTP destination service
- Multiple instances for scalability
- Optimized memory allocation
- Production destination name
- Enhanced security settings

## Creating Custom Extension Files

1. Create a new `.mtaext` file (e.g., `staging.mtaext`)
2. Follow the same structure:
   ```yaml
   _schema-version: 3.3.0
   ID: cap-jira.staging
   extends: cap-jira
   
   modules:
     - name: cap-jira-srv
       properties:
         NODE_ENV: staging
         # Your custom properties
   ```

## Best Practices

1. **Keep base `mta.yaml` environment-agnostic**
2. **Use extension files for environment-specific values**
3. **Name extension files clearly** (dev, prod, staging, etc.)
4. **Version control extension files** alongside your main configuration
5. **Document environment differences** in this file

## Troubleshooting

### Check which extension was applied
```bash
# View the generated MTA descriptor
cf mta cap-jira
```

### Verify environment variables
```bash
# Check app environment
cf env cap-jira-srv
```

### Common Issues
- **Extension not applied**: Ensure you use `-e` flag during build
- **Wrong values**: Check extension file syntax and property names
- **Service binding issues**: Verify resource names match between files
