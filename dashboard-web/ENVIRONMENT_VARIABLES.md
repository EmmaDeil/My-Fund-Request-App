# 📋 Render Environment Variables Setup

## Copy these environment variables to your Render dashboard:

### Required Variables:
```
NODE_ENV=production
PORT=10000
```

### Database Configuration:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```
⚠️ Replace with your actual MongoDB Atlas connection string

### Email Configuration:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```
⚠️ Use Gmail App Password, not your regular password

### Service URLs:
```
DASHBOARD_URL=https://your-dashboard.onrender.com
BACKEND_API_URL=https://my-fund-request-app-backend.vercel.app
```
⚠️ Replace "your-dashboard" with your actual Render service name

### Security:
```
SESSION_SECRET=generate-a-random-32-character-string-here
```
⚠️ Generate a secure random string for production

## 🔧 How to Set in Render:

1. Go to your service in Render dashboard
2. Click "Environment" tab
3. Click "Add Environment Variable"
4. Copy each variable name and value from above
5. Click "Save Changes"
6. Render will automatically redeploy with new variables

## 🔐 Security Notes:

- Never commit these values to Git
- Use strong, unique passwords
- Enable 2-factor authentication on Gmail
- Use MongoDB Atlas with IP restrictions
- Generate a random SESSION_SECRET for production