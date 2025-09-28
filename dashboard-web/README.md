# Fund Request Dashboard Web

A comprehensive web-based dashboard for managing fund requests with real-time analytics, PDF generation, and retirement workflows.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB running locally or connection string
- Gmail account for email notifications

### Installation

1. **Clone and navigate:**
```bash
cd dashboard-web
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your MongoDB and email settings
```

4. **Start the dashboard:**
```bash
npm start
```

Visit: `http://localhost:3001`

## 🔧 Configuration

Edit `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/fundRequestDB

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Server
PORT=3001
DASHBOARD_URL=http://localhost:3001
```

## 📊 Features

- **Real-time Dashboard**: Live fund request monitoring
- **Request Management**: Approve, reject, delete requests
- **PDF Export**: Generate and email professional documents
- **Retirement System**: Secure document upload portal
- **Currency Analytics**: Multi-currency support and conversion
- **Department Analytics**: Breakdown by departments
- **Export Options**: PDF and Excel export

## 🌐 Deployment

### Local Development
```bash
npm run dev  # With auto-restart
```

### Production
```bash
npm run deploy  # Production mode
```

### Docker (Optional)
Create `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📱 API Endpoints

- `GET /` - Dashboard home page
- `GET /api/requests` - Get fund requests
- `GET /api/stats` - Get statistics
- `POST /api/requests/:id/status` - Update request status  
- `POST /api/send-pdf-to-approver` - Send PDF documentation
- `POST /api/send-retirement-notice` - Send retirement notice
- `GET /retire?token=xxx&id=xxx` - Retirement portal
- `POST /api/submit-retirement` - Submit retirement documents

## 🔐 Security

- Environment variables for sensitive data
- Token-based retirement portal access
- File upload validation
- CORS protection

## 📧 Email System

The dashboard integrates with your backend's email service:
- Status change notifications
- PDF documentation sending  
- Retirement notices with secure links
- Document submission confirmations

## 🗂️ File Structure

```
dashboard-web/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env.example      # Environment template
├── models/           # Database models
├── public/           # Static web files
│   └── index.html   # Dashboard interface
└── uploads/         # Retirement document uploads
```

## ⚡ Performance

- Optimized for real-time updates
- Efficient MongoDB queries
- Chunked PDF generation
- File upload with validation

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Find process using port 3001
netstat -ano | findstr :3001
# Kill process by PID
taskkill //PID <PID> //F
```

**MongoDB connection issues:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify database exists

**Email not working:**
- Use Gmail app password (not regular password)
- Enable 2FA and generate app password
- Check EMAIL_HOST and EMAIL_PORT

## 📝 License

MIT License