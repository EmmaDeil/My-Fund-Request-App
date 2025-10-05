# Step-by-Step: Create New Web Service on Render

## Current Situation:
- ✅ Frontend URL: https://my-fund-request-app.onrender.com
- ❌ Deployed as Static Site (can't handle /approve route)
- ✅ Home page works
- ❌ /approve?token=xxx gets 404

## Solution: Create Web Service

### Step 1: Create New Web Service

1. **Go to Render Dashboard**: https://render.com/dashboard
2. **Click "New +"** (top right)
3. **Select "Web Service"**

### Step 2: Connect Repository

1. **Connect to GitHub repository**: `My-Fund-Request-App`
2. **Click "Connect"** next to the repo

### Step 3: Configure the Service

**Name:**
```
my-fund-request-app-v2
```
(Use a different name temporarily)

**Root Directory:**
```
frontend
```

**Environment:**
```
Node
```

**Region:**
```
(Choose closest to you)
```

**Branch:**
```
master
```

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
node server.js
```

**Instance Type:**
```
Free (or your preference)
```

### Step 4: Add Environment Variables (if needed)

Click "Advanced" → Add these if you have custom API URLs:
```
REACT_APP_API_URL=https://your-backend-url.vercel.app/api
NODE_ENV=production
```

### Step 5: Create Web Service

Click **"Create Web Service"**

Wait 3-5 minutes for the deployment...

### Step 6: Test the New Service

Once deployed, you'll get a URL like:
```
https://my-fund-request-app-v2.onrender.com
```

**Test these:**

1. Home page:
```
https://my-fund-request-app-v2.onrender.com/
```
Should load ✅

2. Health endpoint:
```
https://my-fund-request-app-v2.onrender.com/health
```
Should return JSON ✅

3. Approval route:
```
https://my-fund-request-app-v2.onrender.com/approve?token=test123
```
Should load approval page (not 404) ✅

### Step 7: Update Your Custom Domain

Once the new Web Service works:

1. **Old Static Site** → Settings → Custom Domains → Remove your domain
2. **New Web Service** → Settings → Custom Domains → Add your domain
3. Update DNS records if needed

### Step 8: Update Backend FRONTEND_URL

Update your backend (Vercel) environment variable:
```
FRONTEND_URL=https://my-fund-request-app.onrender.com
```
(Keep it the same if using custom domain)

### Step 9: Delete Old Static Site

Once everything works:
1. Go to the old static site service
2. Settings → Danger Zone → Delete Service

---

## Alternative: Quick Workaround (Temporary)

If you don't want to recreate the service, you can:

### Use a redirect service

Create a simple redirect on the backend for approval links:

**In backend server.js**, the redirect endpoint already exists:
```javascript
app.get("/approve/:token", (req, res) => {
  const { token } = req.params;
  // Redirects to frontend
});
```

**Change email URLs to use backend redirect:**
In `emailService.js`, use backend URL:
```javascript
const approvalUrl = `${process.env.BACKEND_URL}/approve/${token}`;
```

Then backend will redirect to frontend home page with hash:
```javascript
const redirectUrl = `${frontendURL}/#/approve/${token}`;
```

This uses HashRouter which works with Static Sites!

---

## Recommended Approach

**Best:** Create new Web Service (Steps 1-9 above)
- Proper SPA routing
- Clean URLs
- No workarounds

**Quick:** Use backend redirect workaround
- Keeps static site
- Uses HashRouter
- Works immediately

Choose based on your preference!
