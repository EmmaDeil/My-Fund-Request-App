# 🔐 Dashboard Login - Quick Reference Card

## 🚀 Access Dashboard

**URL:** https://myfunddashboard.onrender.com

---

## 🔑 Default Login Credentials

```
Username: admin
Password: admin123
```

⚠️ **CHANGE THESE IN PRODUCTION!**

---

## 📋 Quick Actions

### Login
1. Visit dashboard URL
2. Enter username and password
3. Click "Sign In"
4. Check "Remember me" for 7-day session (optional)

### Logout
1. Click "🚪 Logout" button in top right
2. Confirm logout
3. Redirected to login page

---

## 🔧 For Administrators

### Change Password

1. **Generate new password hash:**
   ```bash
   cd dashboard-web
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourNewPassword', 10, (err, hash) => console.log(hash));"
   ```

2. **Update on Render:**
   - Go to Render dashboard
   - Select "dashboard-web" service
   - Go to "Environment" tab
   - Add new variable:
     - Key: `ADMIN_PASSWORD_HASH`
     - Value: [paste the hash from step 1]
   - Click "Save Changes"
   - Service will redeploy automatically

### Add JWT Secret (Recommended)

1. **Generate secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Add to Render:**
   - Environment tab → Add variable
   - Key: `JWT_SECRET`
   - Value: [paste the generated secret]
   - Save

---

## 🛟 Troubleshooting

### Can't Login?

1. **Check credentials:** Username: `admin`, Password: `admin123`
2. **Clear cookies:** Browser settings → Clear site data
3. **Try incognito mode:** Rule out browser cache issues
4. **Check server status:** Visit `/health` endpoint

### Logged Out Immediately?

1. **Check cookie settings:** Enable cookies in browser
2. **HTTPS required:** Make sure using https:// URL
3. **Clear and retry:** Clear cookies and login again

### Forgot Password?

1. **Contact administrator:** Only admins can reset passwords
2. **For admins:** Use the "Change Password" process above
3. **Default fallback:** If locked out, redeploy without ADMIN_PASSWORD_HASH

---

## 📞 Quick Links

- **Dashboard:** https://myfunddashboard.onrender.com
- **Login Page:** https://myfunddashboard.onrender.com/login
- **Health Check:** https://myfunddashboard.onrender.com/health
- **Auth Status:** https://myfunddashboard.onrender.com/api/auth/status

---

## 🔒 Security Notes

✅ **Secure:**
- Passwords hashed with bcrypt
- JWT tokens (24-hour expiration)
- HTTP-only cookies (XSS protection)
- HTTPS enforced in production
- CSRF protection enabled

❌ **Never:**
- Share login credentials
- Use default password in production
- Log in on public computers without logging out
- Share JWT tokens

---

## 📱 Mobile Access

The login page and dashboard are fully responsive:
- ✅ Works on smartphones
- ✅ Works on tablets
- ✅ Works on desktop
- ✅ Touch-friendly buttons

---

## 🎨 Login Page Features

- 🎭 Animated background
- ✨ Floating particles
- 👁️ Password visibility toggle
- ✅ Form validation
- 🔄 Remember me option
- 🎯 Auto-focus username
- 💬 Clear error messages
- ⚡ Loading states

---

## 📊 Session Information

- **Default Duration:** 24 hours
- **Remember Me:** 7 days
- **Auto Logout:** After expiration
- **Multi-Device:** Each device has separate session

---

## ⚙️ Environment Variables

Required for production:

```env
JWT_SECRET=your-secret-key-here
SESSION_SECRET=another-secret-key
ADMIN_PASSWORD_HASH=bcrypt-hash-here
```

---

**For full documentation, see:** `DASHBOARD_AUTHENTICATION_GUIDE.md`

**Last Updated:** October 5, 2025
