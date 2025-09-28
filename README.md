# 💰 Fund Request Management System

A comprehensive enterprise-grade fund request management system with web-based dashboard, real-time monitoring, PDF generation, email notifications, and retirement workflows.

## 🏗️ Project Architecture

```
MyFundRequestApp/
├── 🔧 backend/           # Node.js API server (MongoDB, Email System)
│   ├── models/          # MongoDB database models
│   ├── routes/          # API endpoints  
│   ├── utils/           # Email service & templates
│   └── backups/         # System backups
├── 📱 frontend/          # React user interface  
├── 🌐 dashboard-web/     # Web-based admin dashboard ⭐ PRIMARY
├── 📧 email-checker.js   # Email delivery verification tool
└── 📄 Documentation     # Complete system guides
```

## 🚀 Quick Start Guide

### 🌐 **Dashboard (Primary Interface)** ⭐ RECOMMENDED
```bash
cd dashboard-web
# Windows:
start.bat
# Linux/Mac:
./start.sh
```
**Access:** `http://localhost:3001`  
**Users:** Admins, managers, approvers, finance team

### 🔧 **Backend API Server**
```bash
cd backend
npm install  
npm start
```
**Runs on:** `http://localhost:5000`

### 📱 **Frontend (User Interface)**  
```bash
cd frontend
npm install
npm start  
```
**Runs on:** `http://localhost:3000`

## 🎯 System Components

### 🌐 **Dashboard Web (Admin/Manager Hub)**
**Primary interface for system administration and approvals**

**Core Features:**
- ✅ Real-time fund request monitoring
- ✅ Advanced approval workflows  
- ✅ PDF generation and document management
- ✅ Email notification system with tracking
- ✅ Retirement portal with automatic processing
- ✅ Multi-currency support (NGN, USD, EUR, CAD)
- ✅ Analytics and reporting dashboard
- ✅ User management and permissions

**Key Capabilities:**
- **Request Processing**: Approve/deny with comments and PDF generation
- **Email System**: Professional templates with request ID tracking  
- **Retirement Management**: Automated workflow for fund retirement
- **Document Generation**: PDF certificates and approval documents
- **Real-time Updates**: Live status monitoring across all requests

### 📱 **Frontend (User Portal)**
**Clean, responsive interface for end users**

**Features:**
- Submit new fund requests with file attachments
- Track request status in real-time  
- View approval history and comments
- Mobile-responsive design
- Multi-step form validation

### 🔧 **Backend (API & Services)**
**Robust server infrastructure**

**Services:**
- RESTful API endpoints
- MongoDB database integration
- Advanced email system with beautiful templates
- File upload and processing
- Authentication and authorization
- Request ID tracking system

## 📧 Email System Overview

### **Professional Email Templates**
Modern, responsive designs matching enterprise standards:

- **📋 Approval Requests** → Sent to managers/approvers
- **✅ Confirmation Messages** → Sent to requesters  
- **📊 Status Notifications** → Updates on approvals/denials
- **📄 PDF Attachments** → Official documents with decisions

### **Email Tracking by Request ID**
Every email includes request ID tracking for full audit trail:

```bash
# Track emails for specific request
📋 [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Approval email sent
📧 [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Confirmation sent
✅ [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Status notification sent
```

### **Email Verification Tool**
Smart tool to check and retry email delivery:

```bash
cd backend
node email-checker.js [REQUEST_ID]
```

**Features:**
- ✅ Check which emails were delivered
- ✅ Identify missing emails  
- ✅ Retry failed email deliveries
- ✅ Interactive status verification

## 🛠️ **Development & Testing Tools**

### **Email System Testing**
```bash
cd backend
node test-email-logging.js    # Test email functions
node email-checker.js         # Verify email delivery
```

### **Database Operations**
```bash
cd backend
npm run db:seed              # Seed test data
npm run db:backup            # Create database backup
npm run db:restore           # Restore from backup
```

## 📊 **System Monitoring**

### **Request Status Tracking**
Monitor requests through their complete lifecycle:
1. **Submitted** → Initial request with confirmation email
2. **Under Review** → Approval request sent to managers  
3. **Approved/Denied** → Status notification with PDF
4. **Retired** → Completion workflow (if applicable)

### **Email Delivery Monitoring**  
Track all email communications:
- Real-time logging with request IDs
- Delivery status verification
- Retry mechanisms for failed emails
- Complete audit trail

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/fundrequest

# Email Configuration  
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@company.com

# Frontend URLs
FRONTEND_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3001

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Security
JWT_SECRET=your-jwt-secret-key
BCRYPT_ROUNDS=12
```

### **Email Template Customization**
Professional templates located in `backend/utils/beautifulEmailTemplates.js`:

- **Modern Design**: Inter font, card layouts, gradients
- **Responsive**: Works on desktop and mobile
- **Branded**: Consistent color scheme and styling  
- **Accessible**: Proper contrast ratios and semantic markup

## 🚀 **Deployment**

### **Production Setup**
1. **Backend**: Deploy to cloud provider (AWS, Heroku, DigitalOcean)
2. **Database**: MongoDB Atlas or self-hosted MongoDB
3. **Email**: Configure SMTP service (Gmail, SendGrid, Mailgun)
4. **Frontend**: Deploy to CDN (Netlify, Vercel, AWS S3)
5. **Dashboard**: Deploy alongside backend or separately

### **Docker Deployment** (Optional)
```bash
docker-compose up -d
```

## 🔐 **Security Features**

- ✅ JWT-based authentication
- ✅ Input validation and sanitization  
- ✅ Rate limiting on API endpoints
- ✅ Secure file upload handling
- ✅ Environment-based configuration
- ✅ SQL injection prevention
- ✅ XSS protection

## 📚 **Documentation**

### **System Guides**
- **Email System**: Complete email architecture and troubleshooting
- **API Reference**: Detailed endpoint documentation  
- **Database Schema**: MongoDB collection structures
- **Deployment Guide**: Production setup instructions

### **Email System Documentation**
Comprehensive guides for email functionality:

- **Email Templates**: Professional design system
- **Request ID Tracking**: Full audit trail implementation
- **Delivery Verification**: Status checking and retry mechanisms
- **SMTP Configuration**: Email service setup

## 🧪 **Testing & Quality Assurance**

### **Email System Testing**
- Template rendering verification
- SMTP configuration validation
- Delivery status confirmation
- Request ID tracking accuracy

### **System Integration Tests**
- End-to-end workflow validation
- Database integrity checks
- API endpoint testing
- File upload/download verification

## 🎯 **Key Features Summary**

### **✅ Completed & Operational**
- **Email System**: Professional templates with request ID tracking
- **Dashboard Interface**: Full-featured admin portal
- **PDF Generation**: Automated document creation
- **Multi-currency Support**: NGN, USD, EUR, CAD
- **Retirement Workflows**: Automated fund retirement processing
- **Real-time Monitoring**: Live status updates
- **Email Verification Tools**: Delivery checking and retry mechanisms

### **🔧 System Architecture**
- **Scalable Backend**: Node.js with MongoDB
- **Modern Frontend**: React with responsive design
- **Enterprise Dashboard**: Web-based admin interface
- **Robust Email System**: Professional templates with tracking
- **Comprehensive Documentation**: Complete system guides

## 🆘 **Support & Troubleshooting**

### **Common Issues**
1. **Email Delivery**: Use `email-checker.js` tool for verification
2. **Database Connection**: Check MongoDB URI configuration
3. **File Uploads**: Verify upload directory permissions
4. **CORS Errors**: Check frontend/backend URL configuration

### **Email System Troubleshooting**
- Check SMTP credentials and configuration
- Verify email template rendering
- Use request ID tracking for debugging
- Test with email verification tool

---

## 📞 **Contact & Support**

For technical support or questions about the Fund Request Management System, please refer to the documentation files or contact the development team.

**System Status**: ✅ Fully Operational  
**Version**: 2.0 (Enhanced Email System)  
**Last Updated**: September 2025
  - Real-time fund request monitoring
  - Approve/reject/delete requests
  - Generate and email PDF documents
  - Retirement portal with secure document uploads
  - Currency and department analytics
  - Export to PDF/Excel

### 🔧 Backend
- **Purpose:** API server and business logic
- **Features:**
  - MongoDB database integration
  - Email notification system (SMTP)
  - Fund request processing
  - Authentication and validation

### 📱 Frontend  
- **Purpose:** User interface for submitting requests
- **Users:** Employees requesting funds
- **Features:**
  - Submit fund requests
  - Form validation
  - Request status tracking
   cd backend
   cp .env.example .env
   # Edit .env with your Gmail credentials and MongoDB settings
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   Edit `backend/.env` with your settings:
   ```env
   MONGODB_URI=mongodb://localhost:27017/fundrequest
   JWT_SECRET=your-secret-key
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-app-password
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

### Running the Application

**Option 1: Manual Start**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

**Option 2: Quick Start Script**
```bash
# Make script executable (Linux/Mac)
chmod +x start-local.sh
./start-local.sh
```

### Application Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 📋 Features

- **Fund Request Management**: Create, view, and track funding requests
- **PDF Generation**: Automatic PDF creation for requests
- **Email Notifications**: Automated email alerts with PDF attachments
- **User Authentication**: Login/registration system
- **Approval Workflow**: Multi-step approval process
- **Responsive Design**: Works on desktop and mobile

## 🗂️ Project Structure

```
MyFundRequestApp/
├── backend/                 # Node.js/Express server
│   ├── config/             # Database configuration
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   └── server.js           # Entry point
├── frontend/               # React application
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   └── utils/          # Utilities
└── start-local.sh          # Development startup script
```

## 🛠️ Development Notes

- **Database**: Uses local MongoDB instance
- **Email Service**: Requires Gmail app password for email features
- **File Storage**: PDFs generated and stored temporarily
- **CORS**: Configured for localhost:3000 frontend access

## ❗ Important Security Notes

- This setup is for **LOCAL DEVELOPMENT ONLY**
- Do not use in production without proper security measures
- Keep your `.env` file private and never commit it to version control
- Use strong JWT secrets and database passwords

## 🐛 Troubleshooting

**MongoDB Connection Issues:**
- Ensure MongoDB is running: `mongod` or `brew services start mongodb-community`
- Check connection string in `.env` file

**Email Features Not Working:**
- Verify Gmail app password setup
- Check EMAIL_USER and EMAIL_PASS in `.env`

**Port Conflicts:**
- Backend uses port 5000, frontend uses port 3000
- Change PORT in `.env` if conflicts occur

## 📞 Support

This is a local development setup. For issues:
1. Check console logs in both terminal windows
2. Verify MongoDB is running
3. Confirm all environment variables are set
4. Ensure all dependencies are installed
File `c:\Users\eclef\Documents\VsCodes\SoftwareProjects\MyFundRequestApp\README.md` has been truncated successfully to focus on local development only.