# 📚 Fund Request System Documentation

This directory contains comprehensive documentation for the Fund Request Management System.

## 📖 Documentation Structure

### **Core Documentation**
- **`README.md`** (Root) - Main project overview and quick start guide
- **`EMAIL_SYSTEM.md`** - Complete email system documentation

### **System Components**

#### **🌐 Dashboard Web**
- **Location**: `dashboard-web/README.md`  
- **Purpose**: Admin and manager interface documentation
- **Features**: Real-time monitoring, approvals, PDF generation

#### **📱 Frontend**
- **Location**: `frontend/README.md` (if exists)
- **Purpose**: User interface documentation  
- **Features**: Request submission, status tracking

#### **🔧 Backend**
- **Location**: `backend/README.md` (if exists)
- **Purpose**: API and service documentation
- **Features**: Database operations, email services, file handling

## 🛠️ **Development Tools Documentation**

### **Email System Tools**
Located in `backend/`:

#### **`email-checker.js`**
Interactive email delivery verification and retry tool
```bash
Usage: node email-checker.js [REQUEST_ID]
```

#### **`test-email-logging.js`**  
Email system testing and logging verification
```bash
Usage: node test-email-logging.js
```

## 📧 **Email System Documentation**

### **Quick Reference**
- **Templates**: `backend/utils/beautifulEmailTemplates.js`
- **Service**: `backend/utils/emailService.js`  
- **Testing**: `backend/email-checker.js`
- **Logs**: Console output with `[Request ID: xxx]` format

### **Email Types**
1. **Approval Requests** → Sent to managers/approvers
2. **Confirmations** → Sent to requesters when submitted
3. **Status Notifications** → Sent to requesters when processed
4. **PDF Attachments** → Sent with approval/denial decisions

## 🔧 **Configuration Documentation**

### **Environment Variables**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/fundrequest

# Email System  
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@company.com

# Application URLs
FRONTEND_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3001
```

### **File Structure Overview**
```
MyFundRequestApp/
├── 📄 README.md                          # Main project documentation
├── 📁 docs/                             # This documentation directory
│   ├── EMAIL_SYSTEM.md                 # Email system guide
│   └── index.md                        # This file
├── 🔧 backend/                          # API server
│   ├── utils/emailService.js           # Email service
│   ├── utils/beautifulEmailTemplates.js # Email templates
│   ├── email-checker.js               # Email verification tool
│   └── test-email-logging.js          # Email testing tool
├── 📱 frontend/                         # User interface
├── 🌐 dashboard-web/                    # Admin dashboard
└── 🗂️ Legacy Files (Organized)
    ├── EMAIL_TRACKING_BY_REQUEST_ID.md  # Moved to EMAIL_SYSTEM.md
    ├── EMAIL_ORGANIZATION_COMPLETE.md   # Consolidated
    └── backend/utils/EMAIL_SYSTEM_README.md # Moved to docs/
```

## 🚀 **Getting Started**

### **For New Developers**
1. Read main `README.md` for system overview
2. Review `EMAIL_SYSTEM.md` for email functionality  
3. Check component-specific README files
4. Use development tools for testing and verification

### **For System Administrators**  
1. Focus on configuration and deployment sections
2. Understand email system setup and troubleshooting
3. Use monitoring and verification tools
4. Review security and backup procedures

### **For End Users**
1. Use the main system interfaces (Dashboard/Frontend)
2. Refer to user guides in component documentation
3. Contact support for technical issues

## 🔄 **Documentation Maintenance**

### **When to Update**
- New features added to the system
- Configuration changes or new requirements
- Bug fixes that affect documented behavior  
- Security updates or best practice changes

### **Update Process**
1. Update relevant component documentation
2. Update main README.md if system overview changes
3. Update EMAIL_SYSTEM.md for email-related changes
4. Test all documented procedures and code examples

## 🆘 **Support Resources**

### **Troubleshooting Guides**
- **Email Issues**: See EMAIL_SYSTEM.md troubleshooting section
- **Database Problems**: Check backend documentation  
- **Configuration Errors**: Review environment variable setup
- **Deployment Issues**: Follow deployment guides in main README

### **Development Tools**
- **Email Verification**: Use `backend/email-checker.js`
- **System Testing**: Use component-specific test scripts
- **Log Analysis**: Search for `[Request ID: xxx]` patterns
- **Database Queries**: Use MongoDB tools and backend utilities

---

**Documentation Status**: ✅ Complete and Current  
**Last Updated**: September 2025  
**Maintained By**: Development Team