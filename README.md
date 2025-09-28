# 💰 Fund Request Management System

A comprehensive fund request management system with web-based dashboard, real-time monitoring, PDF generation, and retirement workflows.

## 🏗️ Project Structure

```
MyFundRequestApp/
├── 🔧 backend/           # Node.js API server (MongoDB, Email)
├── 📱 frontend/          # React user interface  
├── 🌐 dashboard-web/     # Web-based admin dashboard ⭐ NEW
└── 📄 README.md         # This file
```

## 🚀 Quick Start

### 1. **Dashboard (Admin/Manager Interface)** ⭐ RECOMMENDED
```bash
cd dashboard-web
# Windows:
start.bat
# Linux/Mac:
./start.sh
```
Visit: `http://localhost:3001`

**Features:** Real-time monitoring, approvals, PDF generation, retirement portal

### 2. **Backend API Server**
```bash
cd backend
npm install  
npm start
```
Runs on: `http://localhost:5000`

### 3. **Frontend (User Interface)**  
```bash
cd frontend
npm install
npm start  
```
Runs on: `http://localhost:3000`

## 🎯 What Each Component Does

### 🌐 Dashboard Web (NEW - Main Admin Tool)
- **Purpose:** Admin and manager interface
- **Users:** Approvers, finance team, administrators
- **Features:**
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