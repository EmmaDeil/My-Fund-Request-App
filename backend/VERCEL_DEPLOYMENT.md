# Vercel Deployment Instructions

## Environment Variables Setup

Before deploying to Vercel, you need to set the following environment variables in your Vercel dashboard:

### Required Environment Variables:
**IMPORTANT**: Set these in Vercel Dashboard (not in .env files for production)

```
# Database Configuration
MONGODB_URI=mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net/fundrequest_prod?retryWrites=true&w=majority&appName=Requests

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=eclefzy@gmail.com
EMAIL_PASS=crmn cgos dfwb fvcs
EMAIL_FROM=eclefzy@gmail.com

# Frontend URL (Update after frontend deployment)
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app

# Security
JWT_SECRET=34186e042ca09cab679f4d7950cde7b47df7356b41e1e634773c663c3aa8007bcfab6bea3daf1811a0951e00b23b5df6c61f9dbfe13f7e56cec44144a03ff735

# Environment
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Steps:

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from backend directory**:
   ```bash
   cd backend
   vercel
   ```

4. **Set Environment Variables**:
   - Go to your Vercel dashboard
   - Navigate to your project → Settings → Environment Variables
   - Add all the required variables listed above

5. **Redeploy after setting environment variables**:
   ```bash
   vercel --prod
   ```

## API Endpoints:
After deployment, your API will be available at:
- `https://your-project.vercel.app/api/fund-requests`
- `https://your-project.vercel.app/api/fund-requests/:id`
- etc.

## Frontend Configuration:
Update your frontend API base URL to point to your Vercel deployment:
```javascript
const API_BASE_URL = 'https://your-project.vercel.app/api';
```

## Testing Deployment:
Use the diagnostic tool to test your production deployment:
```bash
node diagnostic.js
```

## Important Notes:
- Vercel automatically detects this is a Node.js project
- The `vercel.json` configuration handles the serverless setup
- All API routes are accessible under `/api/*` prefix
- Environment variables must be set in Vercel dashboard for production