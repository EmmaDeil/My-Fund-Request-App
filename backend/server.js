const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Simple CORS for local development
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
const db = require("./models/mongoDatabase");

// Initialize MongoDB connection
const initializeDatabase = async () => {
  try {
    await db.init();
    console.log("✅ MongoDB database initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error.message);
    process.exit(1);
  }
};

// Initialize database connection
initializeDatabase();

// Routes
const fundRequestRoutes = require("./routes/fundRequests");
const approvalRoutes = require("./routes/approvals");

app.use("/api/fund-requests", fundRequestRoutes);
app.use("/api/approvals", approvalRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Fund Request API is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📧 Email service configured for: ${process.env.EMAIL_HOST}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
});

module.exports = app;
