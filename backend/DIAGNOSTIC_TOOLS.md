# Fund Request System - Diagnostic Tools

## 📊 Consolidated Diagnostic Tool

All diagnostic functionality has been consolidated into a single comprehensive tool: **`diagnostic.js`**

### 🚀 Usage

```bash
# Show help and available commands
node diagnostic.js help

# Check specific request across all databases
node diagnostic.js check 952522d2-ae3a-4915-8b1f-fca3267f6546

# List requests from specific environment
node diagnostic.js list dev      # Development database only
node diagnostic.js list prod     # Production database only  
node diagnostic.js list both     # Both databases (default)

# Test email functionality for a request
node diagnostic.js email 952522d2-ae3a-4915-8b1f-fca3267f6546

# Database diagnostics and statistics
node diagnostic.js db

# Environment configuration check
node diagnostic.js env
```

### 🔧 Features

**Cross-Database Search**
- Searches both development (`fundrequest_dev`) and production (`fundrequest_prod`) databases
- Shows which database contains the request
- Provides recent requests from each database for reference

**Email Testing**
- Interactive email delivery verification
- Shows expected emails based on request status
- Tracks which emails were successfully delivered
- Offers retry functionality for failed emails

**Database Diagnostics**
- Connection testing for both environments
- Request count and status breakdown
- Recent activity summaries
- Environment-specific configuration validation

**Environment Validation**
- Loads and validates both development and production configurations
- Tests database connections for each environment
- Verifies email and other service configurations

### 🗂️ Environment Management

The tool automatically handles environment switching:

```bash
# Use development environment (default)
node diagnostic.js db

# Use production environment
NODE_ENV=production node diagnostic.js db
```

## 🧹 Cleaned Up Files

The following redundant diagnostic files have been removed:

- ❌ `cross-database-checker.js` → **Merged into `diagnostic.js`**
- ❌ `database-diagnostic.js` → **Merged into `diagnostic.js`**  
- ❌ `email-checker.js` → **Merged into `diagnostic.js`**
- ❌ `email-fixes-summary.js` → **Documentation moved to `PRODUCTION_DATABASE_ANALYSIS.md`**
- ❌ `list-requests.js` → **Merged into `diagnostic.js`**
- ❌ `production-request-checker.js` → **Merged into `diagnostic.js`**
- ❌ `proper-env-database.js` → **Functionality integrated into `diagnostic.js`**
- ❌ `proper-production-checker.js` → **Merged into `diagnostic.js`**

## 🔄 Migration Guide

### Old Commands → New Commands

```bash
# Old way (multiple scripts)
node email-checker.js 952522d2-ae3a-4915-8b1f-fca3267f6546
node list-requests.js
node cross-database-checker.js 952522d2-ae3a-4915-8b1f-fca3267f6546
NODE_ENV=production node database-diagnostic.js

# New way (single script)
node diagnostic.js email 952522d2-ae3a-4915-8b1f-fca3267f6546
node diagnostic.js list
node diagnostic.js check 952522d2-ae3a-4915-8b1f-fca3267f6546
NODE_ENV=production node diagnostic.js db
```

## 🎯 Quick Examples

```bash
# Most common use cases:

# 1. Check if a request exists anywhere
node diagnostic.js check 826aa11a-9036-40a3-88f9-bab8a370d6fd

# 2. See what's in production database  
node diagnostic.js list prod

# 3. Test email system for a known request
node diagnostic.js email 952522d2-ae3a-4915-8b1f-fca3267f6546

# 4. Check if production environment is configured correctly
NODE_ENV=production node diagnostic.js env

# 5. Get database statistics for both environments
node diagnostic.js db
```

## 🔧 Remaining Specialized Tools

These specialized tools are kept for specific purposes:

- ✅ **`email-diagnostic.js`** - SMTP connectivity testing and troubleshooting
- ✅ **`check-approval-token.js`** - Approval token validation (if it exists)
- ✅ **`server.js`** - Main application server
- ✅ **`diagnostic.js`** - New comprehensive diagnostic tool

The diagnostic tool replaces 8 redundant scripts with a single, well-organized, and feature-rich tool that handles all common diagnostic scenarios.