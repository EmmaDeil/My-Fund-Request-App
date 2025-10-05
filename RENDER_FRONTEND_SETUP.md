# Complete Render Frontend Configuration Guide

## Current Issue
✅ Approval URL format is correct: `/approve?token=xxx`
❌ Getting 404 - server not finding the page

## Root Cause
The frontend on Render either:
1. Hasn't been redeployed with the new code
2. Is configured as "Static Site" but should be "Web Service"
3. Build directory isn't being created properly

---

## ✅ SOLUTION: Configure as Web Service

### Step 1: Check Your Service Type

Go to Render Dashboard → Your Frontend

**If it says "Static Site":**
- You need to **delete it** and create a new **Web Service**
- OR change the configuration (if possible)

**If it says "Web Service":**
- Continue with the configuration below ✅

---

### Step 2: Configure Web Service Settings

In Render Dashboard → Your Frontend Service → Settings:

#### **Basic Settings:**
```
Name: my-fund-request-app (or whatever you named it)
Environment: Node
Region: (your choice)
Branch: master
```

#### **Build & Deploy:**
```
Root Directory: frontend

Build Command:
npm install && npm run build

Start Command:
node server.js
```

#### **Environment Variables:**
Add these if needed:
```
REACT_APP_API_URL=https://backend-o0ll.onrender.com/api
NODE_ENV=production
```

---

### Step 3: Verify Package.json

Your `frontend/package.json` should have these dependencies:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "serve": "^14.2.3",
    ...other react dependencies
  },
  "scripts": {
    "build": "react-scripts build",
    "serve": "serve -s build -l $PORT",
    "serve:express": "node server.js"
  }
}
```

---

### Step 4: Commit and Push (Already Done ✅)

Your latest code is already pushed to GitHub.

---

### Step 5: Deploy on Render

1. **Go to Render Dashboard**
2. **Click your frontend service**
3. **Click "Manual Deploy"**
4. **Select "Clear build cache & deploy"**
5. **Wait 3-5 minutes**

---

### Step 6: Check Build Logs

After deployment starts:

1. Click on the deployment to see live logs
2. Look for these SUCCESS messages:
   ```
   ✅ Build directory found: /opt/render/project/src/frontend/build
   ✅ index.html found: /opt/render/project/src/frontend/build/index.html
   ✅ Frontend server running on port 10000
   ```

3. Look for these ERROR messages (if any):
   ```
   ❌ ERROR: Build directory does not exist!
   ❌ ERROR: index.html not found in build directory!
   ```

---

### Step 7: Test Debug Endpoints

After deployment completes, test these URLs:

**1. Health Check:**
```
https://my-fund-request-app.onrender.com/health
```
Should return:
```json
{
  "status": "OK",
  "message": "Frontend server is running",
  "buildPath": "/opt/render/project/src/frontend/build",
  "indexExists": true,
  "timestamp": "2025-10-05T..."
}
```

**2. Files Debug:**
```
https://my-fund-request-app.onrender.com/debug/files
```
Should return list of files in build directory.

**3. Home Page:**
```
https://my-fund-request-app.onrender.com/
```
Should load your React app.

**4. Approval Page:**
```
https://my-fund-request-app.onrender.com/approve?token=test123
```
Should load approval page (even with fake token).

---

## Alternative: Use `serve` Package

If Express isn't working, try the simpler `serve` approach:

### Update Start Command to:
```
npx serve -s build -l $PORT
```

This uses the `serve` package which automatically handles SPA routing.

---

## Common Issues & Solutions

### Issue: "Build directory does not exist"
**Solution:** 
- Check "Root Directory" is set to `frontend`
- Build command should create the build folder: `npm run build`
- Check build logs for npm install or build errors

### Issue: "Cannot find module 'express'"
**Solution:**
- Make sure `express` is in `dependencies` not `devDependencies`
- Build command should run `npm install` (not `npm ci`)

### Issue: Still getting 404
**Solution:**
1. Check Start Command is: `node server.js`
2. Verify the service is a "Web Service" not "Static Site"
3. Check Environment Variables are set correctly
4. Try alternative start command: `npx serve -s build -l $PORT`

### Issue: Home page works but /approve doesn't
**Solution:**
- The catch-all route `app.get("*")` should be LAST in server.js
- Check browser console for JavaScript errors
- Verify React Router is configured with BrowserRouter

---

## Verification Checklist

Before testing approval links:
- [ ] Service type is "Web Service" on Render
- [ ] Root Directory is set to `frontend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `node server.js`
- [ ] Latest code is deployed (check commit hash)
- [ ] Build logs show success messages
- [ ] `/health` endpoint returns 200 OK
- [ ] Home page loads without errors
- [ ] `/approve?token=test` loads (doesn't 404)

Then test with real approval link from email.

---

## Quick Debug Commands

If you have SSH access to Render:
```bash
# Check if build directory exists
ls -la frontend/build/

# Check if index.html exists
cat frontend/build/index.html

# Check server is running
ps aux | grep node

# Check what port it's listening on
netstat -tulpn | grep node
```
