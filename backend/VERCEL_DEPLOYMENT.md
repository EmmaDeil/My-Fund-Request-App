# Vercel Deployment Instructions

## Environment Variables Setup

Before deploying to Vercel, you need to set the following environment variables in your Vercel dashboard:

### Required Environment Variables:
```
# Database Configuration
MONGODB_URI=mongodb+srv://your-user:your-password@your-cluster.mongodb.net/fundrequest_prod

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
APPROVED_EMAIL=admin@yourcompany.com

# Security
JWT_SECRET=your-secure-jwt-secret

# Environment
NODE_ENV=production
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