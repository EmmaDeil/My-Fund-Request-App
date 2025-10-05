# Debug Checklist for Approval URL Issue

## Current Expected Behavior:
- ✅ URL should be: `https://my-fund-request-app.onrender.com/approve?token=xxx`
- ❌ Currently getting: `https://my-fund-request-app.onrender.com//approve/xxx`

## Checklist:

### 1. Vercel Environment Variables
- [ ] Go to Vercel Dashboard → Project → Settings → Environment Variables
- [ ] Check `FRONTEND_URL` = `https://my-fund-request-app.onrender.com` (NO trailing slash!)
- [ ] Save changes

### 2. Verify Deployment
- [ ] Go to Vercel Dashboard → Deployments
- [ ] Latest commit should be: "Force Vercel redeploy with updated approval URL format"
- [ ] Status should be "Ready"
- [ ] Click on deployment → Check build logs for errors

### 3. Check Code Version on Vercel
Add a test endpoint to verify which code is running:

**Add to backend/server.js:**
```javascript
app.get("/api/debug/version", (req, res) => {
  res.json({
    version: "query-params-v2",
    frontendUrl: process.env.FRONTEND_URL,
    timestamp: new Date().toISOString()
  });
});
```

Then visit: `https://your-backend.vercel.app/api/debug/version`

### 4. Clear All Caches
- [ ] Hard refresh Vercel deployment (click Redeploy → Use existing Build Cache: OFF)
- [ ] Clear your email client cache
- [ ] Test with a NEW fund request (old emails have old links)

### 5. Verify emailService.js
SSH into Vercel or check build output to confirm the code has:
```javascript
const approvalUrl = `${baseUrl}/approve?token=${fundRequest.approval_token}`;
```
NOT:
```javascript
const approvalUrl = `${baseUrl}/#/approve/${fundRequest.approval_token}`;
```

## Expected Timeline:
- Git push: ✅ Completed
- Vercel build: ~2-5 minutes
- New emails: Should use new format immediately after build completes

## If Still Broken:
1. Check if Vercel is deploying from correct branch (should be `master`)
2. Check if there are multiple Vercel projects (backend might be deployed twice)
3. Verify `.vercel` folder in project points to correct project
4. Check Vercel project settings → Git → ensure it's connected to correct repo
