/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// Load environment-specific configuration
// Firebase Functions run in production by default
const env = process.env.NODE_ENV || "production";
console.log(`🌍 Loading ${env} environment configuration...`);
console.log(`🔧 Email host: ${process.env.EMAIL_HOST}`);
console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

const app = express();

// Environment-aware CORS configuration for existing frontend
const frontendURL =
  process.env.FRONTEND_URL || "https://my-fund-request-app.onrender.com";
const corsOptions = {
  origin: [
    frontendURL,
    `${frontendURL}/`, // Handle trailing slash variations
    "http://localhost:3000", // Allow local development
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
    throw error; // In Firebase Functions, we don't exit the process
  }
};

// Initialize database connection
initializeDatabase().catch(console.error);

// Routes
const fundRequestRoutes = require("./routes/fundRequests");
const approvalRoutes = require("./routes/approvals");

app.use("/api/fund-requests", fundRequestRoutes);
app.use("/api/approvals", approvalRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Fund Request API is running on Firebase Functions",
    timestamp: new Date().toISOString(),
  });
});

// Root health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Fund Request API - Firebase Functions",
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

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);

// Optional: Set up environment configuration for Firebase Functions
exports.config = functions.https.onRequest((req, res) => {
  res.json({
    message: "Fund Request API Configuration",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
