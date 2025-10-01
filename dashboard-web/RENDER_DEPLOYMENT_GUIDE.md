# 🚀 Dashboard Deployment Guide for Render

## Prerequisites
- GitHub repository with your dashboard-web code
- Render account (free tier available)
- MongoDB Atlas database (or existing MongoDB connection string)
- Gmail SMTP credentials

## 📋 Step-by-Step Deployment

### 1. **Prepare Your Repository**
```bash
# Commit your latest changes
git add .
git commit -m "Prepare dashboard for Render deployment"
git push origin main
```

### 2. **Deploy on Render**

#### Option A: Using render.yaml (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the `dashboard-web` folder
5. Render will automatically detect the `render.yaml` file

#### Option B: Manual Setup
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `fund-request-dashboard`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

### 3. **Environment Variables**
Set these in Render dashboard under "Environment":

#### Required Variables:
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
DASHBOARD_URL=https://your-dashboard.onrender.com
BACKEND_API_URL=https://my-fund-request-app-backend.vercel.app
SESSION_SECRET=your-random-secret-key
```

#### How to Set Environment Variables:
1. In Render dashboard, go to your service
2. Click "Environment" tab
3. Add each variable using the "Add Environment Variable" button
4. Click "Save Changes"

### 4. **Gmail SMTP Setup**
For EMAIL_USER and EMAIL_PASS:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as EMAIL_PASS (not your regular Gmail password)

### 5. **MongoDB Connection**
If using MongoDB Atlas:
1. Whitelist Render IPs (or use 0.0.0.0/0 for all IPs)
2. Get your connection string from Atlas
3. Replace `<username>`, `<password>`, and `<database>` in the URI

### 6. **Deploy and Test**
1. Render will automatically build and deploy
2. Watch the build logs for any errors
3. Once deployed, visit your dashboard URL
4. Test all functionality:
   - Database connection
   - Email management features
   - Request monitoring

## 🔧 Configuration Files

### package.json (Build Script)
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "npm install --production",
    "dev": "nodemon server.js"
  }
}
```

### .env.production (Template)
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=your-mongodb-uri
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
DASHBOARD_URL=https://your-dashboard.onrender.com
BACKEND_API_URL=https://your-backend.vercel.app
SESSION_SECRET=your-secret-key
```

## 🌐 Live URLs After Deployment

### Production URLs:
- **Frontend**: https://my-fund-request-app.onrender.com
- **Backend**: https://my-fund-request-app-backend.vercel.app  
- **Dashboard**: https://fund-request-dashboard.onrender.com ← **NEW**

### Local Development:
- **Dashboard**: http://localhost:3001

## 🐛 Troubleshooting

### Common Issues:

#### 1. Build Fails
```bash
# Error: Missing script: "build"
# Solution: Ensure package.json has build script
"scripts": {
  "build": "npm install --production"
}
```

#### 2. Database Connection Error
```bash
# Error: MongoDB connection failed
# Solutions:
# - Verify MONGODB_URI is correct
# - Check MongoDB Atlas IP whitelist
# - Ensure database credentials are valid
```

#### 3. Email Service Error
```bash
# Error: SMTP authentication failed
# Solutions:
# - Use Gmail App Password, not regular password
# - Verify EMAIL_USER and EMAIL_PASS are correct
# - Check if 2-factor authentication is enabled
```

#### 4. Port Issues
```bash
# Error: Port already in use
# Solution: Render uses PORT=10000, ensure this is set correctly
```

#### 5. Nodemailer/Email Service Error (FIXED)
```bash
# Error: Cannot find module 'nodemailer'
# Solution: Dashboard now includes its own nodemailer dependency
# This issue has been fixed by adding nodemailer to dashboard-web dependencies
# and copying email service files locally
```

#### 6. Module Import Errors
```bash
# Error: Cannot find module '../backend/utils/emailService.js'
# Solution: Dashboard now uses local email service files in ./utils/
# No longer depends on backend directory structure
```

#### 7. 502 Bad Gateway Errors (NEW)
```bash
# Error: 502 Bad Gateway
# Causes:
# - Server crashing on startup
# - Missing environment variables
# - MongoDB connection failures
# Solutions:
# - Check Render logs for startup errors
# - Verify all environment variables are set
# - Test health endpoint: /health
```

#### 8. Email Service Timeout Errors (NEW)
```bash
# Error: Email delivery failed after 3 attempts: Connection timeout
# Causes:
# - SMTP server connectivity issues
# - Incorrect email credentials
# - Network timeouts in production
# Solutions:
# - Verify EMAIL_USER and EMAIL_PASS in Render dashboard
# - Test env-check endpoint: /env-check
# - Check email service logs in Render
```

### Debug Commands:
```bash
# Check logs in Render dashboard
# Go to: Dashboard → Your Service → Logs

# Test locally before deploying:
cd dashboard-web
cp .env.production .env
npm run build
npm start
```

## 🔐 Security Notes

1. **Never commit .env files** - Use Render's environment variables
2. **Use strong passwords** - Generate random SESSION_SECRET
3. **Gmail App Passwords** - Never use your main Gmail password
4. **Database Security** - Use MongoDB Atlas with proper IP restrictions
5. **HTTPS Only** - Render provides HTTPS by default

## 📊 Post-Deployment Checklist

- [ ] Dashboard loads at your Render URL
- [ ] Health check endpoint works: `/health`
- [ ] Environment check endpoint works: `/env-check`
- [ ] Database connection successful (check logs)
- [ ] Email management features work
- [ ] All fund requests display correctly
- [ ] Toast notifications working
- [ ] PDF generation functional
- [ ] No console errors in browser
- [ ] No 502 or 500 errors in production

### 🔍 Health Check Endpoints:

#### `/health` - Server Health Status
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T19:30:00.000Z",
  "port": 10000,
  "env": "production",
  "mongodb": "connected"
}
```

#### `/env-check` - Environment Variables Status
```json
{
  "status": "all_set",
  "missing_variables": [],
  "set_variables": ["MONGODB_URI", "EMAIL_HOST", "EMAIL_USER", "EMAIL_PASS"],
  "timestamp": "2025-10-01T19:30:00.000Z"
}
```

## 🚀 Deployment Complete!

Your Fund Request Dashboard is now live on Render! 

Access it at: `https://your-service-name.onrender.com`

For support, check the Render logs and ensure all environment variables are properly configured.