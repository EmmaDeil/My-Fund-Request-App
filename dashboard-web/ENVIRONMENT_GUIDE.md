# Dashboard Environment Configuration Guide

## 🔍 **Current Status Analysis**

The dashboard is currently configured to read from the **DEVELOPMENT** database:
- **Database**: `fundrequest_dev` 
- **Environment**: `development`
- **Port**: `3001`

## 📊 **Database Environment Options**

### Development Database
```bash
MONGODB_URI=mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net/fundrequest_dev?retryWrites=true&w=majority&appName=Requests
NODE_ENV=development
```

### Production Database  
```bash
MONGODB_URI=mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net/fundrequest_prod?retryWrites=true&w=majority&appName=Requests
NODE_ENV=production
```

## 🔄 **How to Switch Environments**

### Method 1: Using Environment Switcher Scripts

#### Windows:
```cmd
cd dashboard-web
switch-dashboard-env.bat prod    # Switch to production
switch-dashboard-env.bat dev     # Switch to development
```

#### Linux/Mac:
```bash
cd dashboard-web
chmod +x switch-dashboard-env.sh
./switch-dashboard-env.sh prod   # Switch to production
./switch-dashboard-env.sh dev    # Switch to development
```

### Method 2: Manual Configuration

#### For Production:
```bash
cd dashboard-web
cp .env.production .env
```

#### For Development:
```bash
cd dashboard-web
cp .env.example .env
# Then edit .env with development database URI
```

### Method 3: Direct File Editing

Edit `dashboard-web/.env` and change:
```bash
# Change this line:
MONGODB_URI=mongodb+srv://...fundrequest_dev?...

# To this for production:
MONGODB_URI=mongodb+srv://...fundrequest_prod?...
```

## 🚀 **Quick Environment Check**

To verify which database the dashboard is connected to:

```bash
cd dashboard-web
node -e "
require('dotenv').config();
const dbUri = process.env.MONGODB_URI;
const dbName = dbUri ? dbUri.split('/').pop()?.split('?')[0] : 'unknown';
console.log('📊 Database:', dbName);
console.log('🌍 Environment:', dbName.includes('_prod') ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('📍 Port:', process.env.PORT);
"
```

## ⚠️ **Important Notes**

1. **Data Consistency**: Make sure you're viewing the same database environment as your main backend
2. **Production Safety**: Always verify you're in the correct environment before making changes
3. **Restart Required**: After changing `.env`, restart the dashboard server
4. **Environment Variables**: The dashboard reads from `.env` file, not from system environment variables

## 🔧 **Environment Files**

- `.env` - Active configuration (changes based on environment)
- `.env.example` - Development template
- `.env.production` - Production configuration
- `switch-dashboard-env.bat` - Windows environment switcher
- `switch-dashboard-env.sh` - Linux/Mac environment switcher

## 📋 **Verification Steps**

After switching environments:

1. **Check Configuration**:
   ```bash
   cat .env | grep MONGODB_URI
   ```

2. **Start Dashboard**:
   ```bash
   npm start
   ```

3. **Verify Connection**: Look for connection message showing correct database name

4. **Test Data**: Verify the dashboard shows data from the expected environment

## 🎯 **Common Use Cases**

- **Development**: Use `fundrequest_dev` to test dashboard features
- **Production Monitoring**: Use `fundrequest_prod` to monitor live fund requests
- **Data Migration**: Switch environments to compare data between dev/prod
- **Troubleshooting**: Check production issues by connecting to prod database