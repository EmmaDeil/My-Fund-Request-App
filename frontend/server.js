const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// API health check (optional, for debugging)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Frontend server is running',
    timestamp: new Date().toISOString(),
  });
});

// Handle React Router - ALL routes should return the index.html
// This is crucial for BrowserRouter to work properly
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${path.join(__dirname, 'build')}`);
});
