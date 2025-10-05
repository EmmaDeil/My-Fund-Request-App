const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Check if build directory exists
const buildPath = path.join(__dirname, "build");
if (!fs.existsSync(buildPath)) {
  console.error("❌ ERROR: Build directory does not exist!");
  console.error(`Expected path: ${buildPath}`);
  process.exit(1);
}

console.log(`✅ Build directory found: ${buildPath}`);

// Check if index.html exists
const indexPath = path.join(buildPath, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ ERROR: index.html not found in build directory!");
  console.error(`Expected path: ${indexPath}`);
  process.exit(1);
}

console.log(`✅ index.html found: ${indexPath}`);

// Serve static files from the React app build directory
app.use(express.static(buildPath));

// API health check (optional, for debugging)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Frontend server is running",
    buildPath: buildPath,
    indexExists: fs.existsSync(indexPath),
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check what files are in build
app.get("/debug/files", (req, res) => {
  try {
    const files = fs.readdirSync(buildPath);
    res.json({
      buildPath: buildPath,
      files: files,
      indexExists: fs.existsSync(indexPath),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      buildPath: buildPath,
    });
  }
});

// Handle React Router - ALL routes should return the index.html
// This is crucial for BrowserRouter to work properly
app.get("*", (req, res) => {
  console.log(`📄 Serving ${req.url} -> index.html`);
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${buildPath}`);
});
