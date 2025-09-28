# Real-time Fund Request Database Dashboard

## Overview
A comprehensive web-based dashboard for monitoring your Fund Request database in real-time. Built with Express.js backend and vanilla JavaScript frontend.

## Features

### 🚀 **Real-time Monitoring**
- Live statistics updating every 30 seconds
- Real-time fund request data display
- Automatic data refresh without page reload
- Live status indicators

### 📊 **Comprehensive Statistics**
- **Pending Requests**: Awaiting approval count
- **Approved Requests**: Successfully approved count  
- **Rejected Requests**: Declined requests count
- **Urgent Requests**: High priority items
- **Total Amount**: Sum of all requested funds
- **Approved Amount**: Total approved funding

### 🔍 **Advanced Filtering & Search**
- **Text Search**: Search across requester names, purposes, descriptions, emails
- **Status Filter**: Filter by pending/approved/rejected
- **Priority Filter**: Show urgent or normal priority only
- **Department Filter**: Filter by specific departments
- **Real-time Filtering**: Results update as you type

### 📋 **Request Management**
- **Paginated Display**: 10 requests per page with navigation
- **Detailed Information**: Full request details including:
  - Requester name and email
  - Request purpose and description
  - Amount with currency formatting
  - Department information
  - Submission date
  - Status badges
  - Urgent indicators

### ⚡ **Recent Activity**
- Last 10 updated requests
- Quick status overview
- Condensed information display
- Real-time activity tracking

### 🏢 **Department Analytics**
- Department-wise breakdowns
- Request counts per department
- Status distribution (Pending/Approved/Rejected)
- Total amounts by department
- Sorted by activity level

## How to Start

### Method 1: Using npm script
```bash
cd database-tools
npm run dashboard
```

### Method 2: Using startup scripts
**Windows:**
```bash
start-dashboard.bat
```

**Linux/Mac:**
```bash
./start-dashboard.sh
```

### Method 3: Direct execution
```bash
cd database-tools
node src/dashboard/server.js
```

## Accessing the Dashboard

Once started, open your browser and navigate to:
**http://localhost:3001**

## Configuration

### Environment Variables (.env)
```properties
# Database Connection
MONGODB_URI=your_mongodb_connection_string
DB_NAME=your_database_name

# Dashboard Settings
DASHBOARD_PORT=3001
DASHBOARD_HOST=localhost
```

### Port Configuration
The dashboard runs on port 3001 by default. You can change this by modifying:
- `DASHBOARD_PORT` in your `.env` file
- Or set environment variable: `PORT=your_port_number`

## API Endpoints

The dashboard exposes several REST API endpoints:

### `/api/requests`
- **Method**: GET
- **Purpose**: Retrieve paginated fund requests
- **Parameters**: 
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `status`: Filter by status (pending/approved/rejected)
  - `urgent`: Filter by urgency (true/false)
  - `department`: Filter by department name
  - `search`: Text search across multiple fields
  - `sort`: Sort field (default: -created_at)

### `/api/stats`
- **Method**: GET
- **Purpose**: Get real-time statistics
- **Returns**: Complete dashboard statistics

### `/api/recent`
- **Method**: GET  
- **Purpose**: Get recent activity
- **Returns**: Last 10 updated requests

### `/api/departments`
- **Method**: GET
- **Purpose**: Get department breakdown
- **Returns**: Request counts and amounts by department

## Dashboard Features

### Auto-refresh
- Automatically updates every 30 seconds
- Can be toggled on/off
- Shows last update timestamp
- Maintains current filters during refresh

### Responsive Design
- Mobile-friendly interface
- Adaptive layouts for different screen sizes
- Touch-friendly controls for mobile devices
- Professional gradient design

### User Experience
- **Loading States**: Shows loading indicators during data fetch
- **Error Handling**: Graceful error messages for failed requests
- **Status Badges**: Color-coded status indicators
- **Urgent Indicators**: Special highlighting for urgent requests
- **Currency Formatting**: Proper currency display with symbols
- **Date Formatting**: User-friendly date and time display

## Technical Stack

### Backend
- **Express.js**: Web server framework
- **Mongoose**: MongoDB object modeling
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **Modern CSS**: Grid and Flexbox layouts
- **Fetch API**: For AJAX requests
- **CSS Animations**: Smooth transitions and hover effects

## Performance Features

### Optimizations
- **Pagination**: Limits data transfer
- **Debounced Search**: Reduces unnecessary API calls
- **Connection Pooling**: Efficient database connections
- **Selective Fields**: Only fetches required data
- **Indexed Queries**: Fast database lookups

### Monitoring
- **Real-time Updates**: 30-second refresh cycle
- **Live Statistics**: Updated counters and amounts
- **Activity Tracking**: Recent changes monitoring
- **Department Analytics**: Live organizational insights

## Security Features

- **CORS Enabled**: Secure cross-origin requests
- **Input Sanitization**: Protection against injection attacks
- **Error Handling**: Safe error messages without exposing internals
- **Environment Variables**: Secure configuration management

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Features**: ES6+, Fetch API, CSS Grid/Flexbox
- **Responsive**: Works on tablets and mobile devices

## Troubleshooting

### Common Issues

1. **Port 3001 in use**: Change `DASHBOARD_PORT` in .env
2. **Database connection**: Verify `MONGODB_URI` in .env
3. **Empty data**: Ensure your database has fund request records
4. **Auto-refresh stopped**: Refresh the browser page

### Debug Mode
Start with debug logging:
```bash
DEBUG=* npm run dashboard
```

## Integration

The dashboard can be integrated with your existing Fund Request application:
- Use the same MongoDB database
- Share environment configurations  
- Compatible with existing data structure
- No modifications to main app required

---

## Quick Start Summary

1. **Install dependencies**: `npm install` (if not done)
2. **Configure environment**: Copy `.env.example` to `.env` and update
3. **Start dashboard**: `npm run dashboard`
4. **Open browser**: Navigate to `http://localhost:3001`
5. **Monitor real-time**: Watch your fund requests update automatically

The dashboard provides a comprehensive, real-time view of your fund request system with professional UI and powerful filtering capabilities.