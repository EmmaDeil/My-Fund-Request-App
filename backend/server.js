const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Load environment-specific configuration
const env = process.env.NODE_ENV || "development";
console.log(`🌍 Loading ${env} environment configuration...`);
console.log(
  `🔧 Detected PORT: ${process.env.PORT || "not set, using fallback"}`
);

// Load the appropriate .env file
if (env === "production") {
  require("dotenv").config({ path: ".env.production" });
} else if (env === "development") {
  require("dotenv").config({ path: ".env.development" });
}
// Fallback to default .env file
require("dotenv").config();

const app = express();
// Use PORT from environment with multiple fallbacks for maximum compatibility
const PORT =
  process.env.PORT || process.env.port || process.env.SERVER_PORT || 5000;

// Environment-aware CORS configuration
const frontendURL = (
  process.env.FRONTEND_URL || "http://localhost:3000"
).replace(/\/$/, "");
const corsOptions = {
  origin: [
    frontendURL,
    `${frontendURL}/`, // Handle trailing slash variations
    "http://localhost:3000",
    "http://localhost:3000/",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

console.log(`🌐 CORS configured for: ${frontendURL} (and variants)`);
app.use(cors(corsOptions));

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

// Start server with enhanced compatibility
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📧 Email service configured for: ${process.env.EMAIL_HOST}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🏠 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle server shutdown gracefully
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed successfully");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed successfully");
    process.exit(0);
  });
});

module.exports = app;
