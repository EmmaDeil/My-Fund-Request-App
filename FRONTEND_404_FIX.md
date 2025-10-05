# Complete Render Frontend Deployment Fix

## Issue
Getting 404 on: `https://my-fund-request-app.onrender.com/approve?token=xxx`

## Root Cause
Render needs to be configured to serve the React SPA (Single Page Application) correctly for BrowserRouter.

---

## ✅ Solution: Configure Render Properly

### Step 1: Verify Your Render Service Type

Go to Render Dashboard → Your Frontend Service

**Check what type of service it is:**

#### Option A: Static Site (Recommended)
If it says "Static Site":

1. **Settings** → **Build & Deploy**
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`

2. **Redeploy** (use "Clear build cache & deploy")

#### Option B: Web Service
If it says "Web Service":

You need to serve the build folder with a server that handles SPA routing.

1. Add serve to your dependencies:
   ```bash
   cd frontend
   npm install --save serve
   ```

2. Update `package.json` scripts:
   ```json
   "scripts": {
     "start": "react-scripts start",
     "build": "react-scripts build",
     "serve": "serve -s build -l $PORT"
   }
   ```

3. In Render Settings:
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm run serve`

---

### Step 2: Verify _redirects File

The file `frontend/public/_redirects` should contain:
```
/*    /index.html   200
```

This is already in your repo ✅

---

### Step 3: Push Changes and Redeploy

1. Commit changes (if any):
   ```bash
   git add -A
   git commit -m "Fix: Configure frontend for BrowserRouter on Render"
   git push origin master
   ```

2. Go to Render Dashboard
3. Click "Manual Deploy" → "Clear build cache & deploy"
4. Wait for deployment (2-3 minutes)

---

### Step 4: Test

After deployment:
1. Visit: `https://my-fund-request-app.onrender.com/`
2. It should show your home page ✅
3. Visit: `https://my-fund-request-app.onrender.com/approve?token=test`
4. It should show approval page (even with invalid token) ✅

---

## Alternative: Quick Fix with Web Service

If Static Site doesn't work, convert to Web Service:

1. **Install serve**:
   ```bash
   cd frontend
   npm install serve
   ```

2. **Create `server.js` in frontend folder**:
   ```javascript
   const express = require('express');
   const path = require('path');
   
   const app = express();
   const PORT = process.env.PORT || 3000;
   
   // Serve static files from build directory
   app.use(express.static(path.join(__dirname, 'build')));
   
   // Handle React routing - return all requests to React app
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, 'build', 'index.html'));
   });
   
   app.listen(PORT, () => {
     console.log(`Frontend server running on port ${PORT}`);
   });
   ```

3. **Update package.json**:
   ```json
   "dependencies": {
     ...existing,
     "express": "^4.18.2"
   },
   "scripts": {
     "start": "react-scripts start",
     "build": "react-scripts build",
     "serve": "node server.js"
   }
   ```

4. **In Render**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run serve`

---

## Common Issues

### Issue: Still getting 404
**Solution**: Clear Render build cache and redeploy

### Issue: Home page works but /approve doesn't
**Solution**: _redirects file not being used. Switch to Web Service method above.

### Issue: Blank page
**Solution**: Check browser console for errors. Might be API URL mismatch.

---

## Verification Checklist

After deployment, check:
- [ ] Home page loads: `https://my-fund-request-app.onrender.com/`
- [ ] Approval route loads: `https://my-fund-request-app.onrender.com/approve?token=test`
- [ ] Browser console shows no 404 for index.html
- [ ] React Router is handling the routes (check Network tab)
