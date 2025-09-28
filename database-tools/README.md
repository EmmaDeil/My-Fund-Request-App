# Fund Request Database Tools 🗄️

A comprehensive database management and analytics workspace for the Fund Request MongoDB database.

## Features

### 🔍 **Search & Query Tools**
- Advanced search with multiple filters
- Real-time query builder
- Custom MongoDB queries
- Full-text search capabilities

### 📊 **Analytics Dashboard**
- Request status distributions
- Department-wise spending analysis
- Approval rate metrics
- Time-based trends
- Interactive charts and visualizations

### 📈 **Reporting System**
- Generate detailed reports
- Export data in multiple formats (CSV, Excel, JSON)
- Custom date range reports
- Automated report scheduling

### 🖥️ **Web Dashboard**
- Real-time data visualization
- Interactive tables and charts
- Live database monitoring
- User-friendly interface

### ⚡ **CLI Tools**
- Command-line interface for quick operations
- Batch operations and data manipulation
- Database backup and restore
- Data migration utilities

## Quick Start

### 1. Install Dependencies
```bash
cd database-tools
npm install
```

### 2. Configure Environment
Copy your MongoDB connection string to `.env`:
```env
MONGODB_URI=your_mongodb_connection_string
```

### 3. Available Commands

#### CLI Interface
```bash
npm start                    # Interactive CLI menu
npm run search              # Advanced search tool
npm run analytics           # Generate analytics reports
npm run export             # Export data to files
npm run backup             # Backup database
```

#### Web Dashboard
```bash
npm run dashboard          # Start web dashboard (http://localhost:3001)
npm run dev               # Start dashboard in development mode
```

## Tools Overview

### 🔍 Search Tool (`search.js`)
- Filter by status, department, date range, amount
- Sort and paginate results
- Export search results
- Save frequently used queries

### 📊 Analytics Tool (`analytics.js`)
- Request statistics by status
- Department spending analysis
- Approval rate calculations
- Monthly/yearly trends
- Performance metrics

### 📋 Export Tool (`export.js`)
- Export to CSV, Excel, JSON formats
- Custom field selection
- Filtered exports
- Scheduled exports

### 🖥️ Web Dashboard
- Real-time charts using Chart.js
- Interactive data tables
- Live database monitoring
- Mobile-responsive design

### 🔧 CLI Interface (`cli.js`)
- Interactive menu system
- Quick database operations
- Batch processing tools
- System health checks

## Usage Examples

### Search for High-Value Pending Requests
```bash
npm run search -- --status pending --min-amount 100000 --currency NGN
```

### Generate Monthly Report
```bash
npm run analytics -- --month 2025-09 --export-csv
```

### Export All Approved Requests
```bash
npm run export -- --status approved --format excel --output approved_requests.xlsx
```

### Start Interactive Dashboard
```bash
npm run dashboard
# Visit http://localhost:3001
```

## Directory Structure

```
database-tools/
├── src/
│   ├── cli.js              # Main CLI interface
│   ├── search.js           # Search functionality
│   ├── analytics.js        # Analytics and reporting
│   ├── export.js           # Data export utilities
│   ├── backup.js           # Database backup tools
│   ├── models/             # Database models
│   ├── utils/              # Utility functions
│   └── dashboard/          # Web dashboard
│       ├── server.js       # Express server
│       ├── public/         # Static assets
│       └── views/          # EJS templates
├── exports/                # Generated export files
├── backups/                # Database backups
├── reports/                # Generated reports
└── config/                 # Configuration files
```

## Configuration

### Environment Variables (.env)
```env
# Database Configuration
MONGODB_URI=mongodb+srv://...
DB_NAME=fund_requests

# Dashboard Configuration
DASHBOARD_PORT=3001
DASHBOARD_HOST=localhost

# Export Configuration
EXPORT_PATH=./exports
BACKUP_PATH=./backups
REPORT_PATH=./reports

# Authentication (optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password
```

## Features in Detail

### Advanced Search
- **Multi-field filtering**: Status, department, amount range, date range
- **Sorting options**: By date, amount, status, department
- **Pagination**: Handle large datasets efficiently
- **Export results**: Save search results to files

### Analytics Dashboard
- **Status Distribution**: Pie charts showing request statuses
- **Department Analysis**: Bar charts of spending by department
- **Trend Analysis**: Line charts showing request patterns over time
- **Key Metrics**: Total requests, approval rates, average amounts

### Data Export
- **Multiple formats**: CSV, Excel (.xlsx), JSON
- **Custom selections**: Choose specific fields to export
- **Filtered exports**: Export only matching records
- **Automated exports**: Schedule regular data exports

### Real-time Monitoring
- **Live updates**: Dashboard updates automatically
- **Performance metrics**: Database query performance
- **System health**: Monitor database connection status
- **Alerts**: Notifications for important events

## Security Features

- Environment variable configuration
- Optional authentication for web dashboard
- Secure database connections
- Input validation and sanitization
- Rate limiting for API endpoints

## Coming Soon

- 📧 Email report delivery
- 🔔 Real-time notifications
- 📱 Mobile app companion
- 🔄 Data synchronization tools
- 🎨 Custom dashboard themes
- 🔍 Advanced query builder UI

---

**Built for the Fund Request Application MongoDB Database Management** 🚀