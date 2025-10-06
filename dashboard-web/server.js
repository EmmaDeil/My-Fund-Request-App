const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const PDFDocument = require("pdfkit");
const multer = require("multer");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const session = require("express-session");

// Load environment variables
// Load .env.production in production, .env otherwise
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
require("dotenv").config({ path: envFile });

// Import authentication middleware
const {
  authenticateToken,
  verifyCredentials,
  generateToken,
  checkAuth,
} = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 10000; // Use Render's default port

// Enhanced middleware for production
app.use(
  cors({
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fund-request-dashboard-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));

// Protect all API routes except auth and public endpoints
app.use("/api/", (req, res, next) => {
  // Allow auth routes and retire/submit-retirement endpoints
  if (
    req.path.startsWith("/auth/") ||
    req.path === "/submit-retirement" ||
    req.path.startsWith("/retirement-documents/")
  ) {
    return next();
  }
  // All other API routes require authentication
  authenticateToken(req, res, next);
});

// Request timeout middleware for production
app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    // 5 minutes timeout
    console.error("Request timeout for:", req.path);
    if (!res.headersSent) {
      res.status(408).json({ error: "Request timeout" });
    }
  });
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || "development",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Environment check endpoint
app.get("/env-check", (req, res) => {
  const requiredEnvs = [
    "MONGODB_URI",
    "EMAIL_HOST",
    "EMAIL_USER",
    "EMAIL_PASS",
  ];
  const missing = requiredEnvs.filter((env) => !process.env[env]);

  res.json({
    status: missing.length === 0 ? "all_set" : "missing_variables",
    missing_variables: missing,
    set_variables: requiredEnvs
      .filter((env) => process.env[env])
      .map((env) => env),
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login page (public)
app.get("/login", (req, res) => {
  // If already logged in, redirect to dashboard
  const user = checkAuth(req);
  if (user) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Login API endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password, remember } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Verify credentials
    const user = await verifyCredentials(username, password);

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set token in cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days or 24 hours
    };

    res.cookie("token", token, cookieOptions);

    // Also set user in session
    req.session.user = user;

    console.log(`✅ User logged in: ${username}`);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  req.session.destroy();
  res.json({ success: true, message: "Logged out successfully" });
});

// Check auth status
app.get("/api/auth/status", (req, res) => {
  const user = checkAuth(req);
  if (user) {
    res.json({ authenticated: true, user });
  } else {
    res.json({ authenticated: false });
  }
});

// Retirement portal page (public - requires token in URL)
app.get("/retire", async (req, res) => {
  try {
    const { token, id } = req.query;

    if (!token || !id) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Retirement Link</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; padding: 40px 20px; text-align: center; }
            .error { background: white; max-width: 400px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .error h1 { color: #dc3545; margin-bottom: 20px; }
            .error p { color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Invalid Link</h1>
            <p>The retirement link is invalid or has expired. Please contact support for assistance.</p>
          </div>
        </body>
        </html>
      `);
    }

    const request = await FundRequest.findOne({
      _id: id,
      approval_token: token,
      status: "approved",
    });

    if (!request) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Request Not Found</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; padding: 40px 20px; text-align: center; }
            .error { background: white; max-width: 400px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .error h1 { color: #dc3545; margin-bottom: 20px; }
            .error p { color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Request Not Found</h1>
            <p>The fund request was not found or is not eligible for retirement. Please verify the link and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Serve the retirement portal page
    res.send(getRetirementPortalHTML(request));
  } catch (error) {
    console.error("Error serving retirement portal:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; padding: 40px 20px; text-align: center; }
          .error { background: white; max-width: 400px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .error h1 { color: #dc3545; margin-bottom: 20px; }
          .error p { color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>⚠️ Server Error</h1>
          <p>There was an error processing your request. Please try again later or contact support.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// MongoDB connection
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set!");
  console.error("");
  console.error("🔧 To fix this, you have two options:");
  console.error("");
  console.error("Option 1 - Use your existing MongoDB Atlas connection:");
  console.error("  1. Copy your MongoDB Atlas URI from your backend .env file");
  console.error(
    "  2. Update MONGODB_URI in dashboard-web/.env with the same URI"
  );
  console.error("");
  console.error("Option 2 - Install local MongoDB:");
  console.error(
    "  1. Install MongoDB Community Server from: https://www.mongodb.com/try/download/community"
  );
  console.error("  2. Start MongoDB service");
  console.error(
    "  3. Use: MONGODB_URI=mongodb://localhost:27017/fundRequestDB"
  );
  console.error("");
  console.error(
    "💡 The dashboard needs to connect to the same database as your main backend"
  );
  process.exit(1);
}

// MongoDB connection function
function connectToMongoDB() {
  return mongoose
    .connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    })
    .then(() => {
      console.log("✅ Connected to MongoDB");
      console.log(
        `📊 Dashboard monitoring database: ${
          process.env.MONGODB_URI.split("@")[1]?.split("/")[0] || "cluster"
        }`
      );

      // Start server only after MongoDB connection is established (first time only)
      if (!app.listening) {
        app.listen(PORT, () => {
          console.log(
            `🌐 Database Dashboard running on http://localhost:${PORT}`
          );
          console.log(`📊 Real-time fund request monitoring active`);
          console.log(`🔗 MongoDB connection established and server ready`);
        });
        app.listening = true;
      } else {
        console.log(
          `🔄 MongoDB reconnected - server already running on port ${PORT}`
        );
      }
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      console.error("");
      console.error("💡 Common solutions:");
      console.error(
        "  - Verify MONGODB_URI is correct in environment variables"
      );
      console.error(
        "  - Check if MongoDB Atlas IP whitelist includes 0.0.0.0/0"
      );
      console.error("  - Ensure database user has proper permissions");
      console.error("  - Check network connectivity");

      // In production, start server even if MongoDB connection fails initially
      if (process.env.NODE_ENV === "production") {
        if (!app.listening) {
          console.log(
            "⚠️ Starting server without MongoDB connection for health checks"
          );
          app.listen(PORT, () => {
            console.log(
              `🌐 Database Dashboard running on http://localhost:${PORT} (MongoDB disconnected)`
            );
            console.log(`🔄 Will continue retrying MongoDB connection...`);
          });
          app.listening = true;
        }

        console.log("🔄 Retrying MongoDB connection in 10 seconds...");
        setTimeout(() => {
          connectToMongoDB();
        }, 10000);
      } else {
        process.exit(1);
      }
    });
}

// Initialize MongoDB connection
connectToMongoDB();

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

// Middleware to check MongoDB connection before database operations
function checkMongoConnection(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    console.warn(
      `⚠️ Database operation attempted while MongoDB disconnected: ${req.path}`
    );
    return res.status(503).json({
      error: "Database unavailable",
      message: "MongoDB connection is not ready. Please try again in a moment.",
      status: "service_unavailable",
      retry_after: 5, // seconds
    });
  }
  next();
}

// Fund Request Schema (matching your main app)
const fundRequestSchema = new mongoose.Schema({
  requester_name: { type: String, required: true },
  requester_email: { type: String, required: true },
  approver_email: { type: String, required: true },
  purpose: { type: String, required: true },
  description: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: "NGN" },
  urgent: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  approval_token: String,
  approved_by: String,
  approved_at: Date,
  rejected_by: String,
  rejected_at: Date,
  rejection_reason: String,
  department: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const FundRequest = mongoose.model("FundRequest", fundRequestSchema);

// PDF Generation Function
function generateRequestPDF(request, status) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];

    // Collect PDF data
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .fontSize(24)
      .fillColor("#2c3e50")
      .text("Fund Request Official Document", { align: "center" })
      .moveDown();

    // Status Badge
    const statusColor =
      status === "approved"
        ? "#28a745"
        : status === "rejected"
        ? "#dc3545"
        : "#ffc107";
    doc
      .fontSize(16)
      .fillColor(statusColor)
      .text(`Status: ${status.toUpperCase()}`, { align: "center" })
      .moveDown(1.5);

    // Document Details
    doc
      .fontSize(14)
      .fillColor("#2c3e50")
      .text("DOCUMENT INFORMATION", { underline: true })
      .moveDown(0.5);

    const docInfo = [
      ["Request ID:", request._id.toString()],
      ["Generated:", new Date().toLocaleString()],
      ["Document Type:", "Official Fund Request Documentation"],
      ["Status:", status.toUpperCase()],
    ];

    docInfo.forEach(([label, value]) => {
      doc
        .fontSize(12)
        .fillColor("#6c757d")
        .text(label, { continued: true })
        .fillColor("#2c3e50")
        .text(" " + value)
        .moveDown(0.3);
    });

    doc.moveDown(1);

    // Request Details
    doc
      .fontSize(14)
      .fillColor("#2c3e50")
      .text("REQUEST DETAILS", { underline: true })
      .moveDown(0.5);

    const requestDetails = [
      ["Purpose:", request.purpose || "Not specified"],
      ["Requester Name:", request.requester_name || "Not specified"],
      ["Requester Email:", request.requester_email || "Not specified"],
      [
        "Amount:",
        `${getCurrencySymbol(request.currency)} ${
          request.amount?.toLocaleString() || "0"
        }`,
      ],
      ["Currency:", request.currency || "Not specified"],
      ["Department:", request.department || "Not specified"],
      ["Priority:", request.urgent ? "HIGH PRIORITY" : "Normal"],
      [
        "Submitted Date:",
        request.created_at
          ? new Date(request.created_at).toLocaleDateString()
          : "Not available",
      ],
      ["Approver Email:", request.approver_email || "Not specified"],
      ["Approval Token:", request.approval_token || "Not generated"],
    ];

    requestDetails.forEach(([label, value]) => {
      doc
        .fontSize(12)
        .fillColor("#6c757d")
        .text(label, { continued: true })
        .fillColor("#2c3e50")
        .text(" " + value)
        .moveDown(0.3);
    });

    // Description if available
    if (request.description) {
      doc
        .moveDown(1)
        .fontSize(14)
        .fillColor("#2c3e50")
        .text("DESCRIPTION", { underline: true })
        .moveDown(0.5)
        .fontSize(12)
        .fillColor("#2c3e50")
        .text(request.description, { align: "justify" })
        .moveDown(1);
    }

    // Footer
    doc
      .moveDown(2)
      .fontSize(10)
      .fillColor("#6c757d")
      .text(
        "This document is generated automatically by the Fund Request Management System.",
        { align: "center" }
      )
      .text(
        `© ${new Date().getFullYear()} Fund Request Management System - Confidential Document`,
        {
          align: "center",
        }
      );

    // Finalize the PDF
    doc.end();
  });
}

function getCurrencySymbol(currency) {
  const symbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    JPY: "¥",
  };
  return symbols[currency] || currency;
}

// Configure multer for file uploads - using memory storage to save to MongoDB
const storage = multer.memoryStorage(); // Store files in memory, not on disk

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype =
      allowedTypes.test(file.mimetype) ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images, PDFs, and Word documents are allowed"));
    }
  },
});

function getRetirementPortalHTML(request) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fund Retirement Portal</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          min-height: 100vh; 
          padding: 20px; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 16px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
          overflow: hidden; 
        }
        .header { 
          background: linear-gradient(135deg, #ffd700, #ffb347); 
          padding: 40px; 
          text-align: center; 
          color: #333; 
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { font-size: 16px; opacity: 0.8; }
        .content { padding: 40px; }
        .request-details { 
          background: #f8f9fa; 
          border-radius: 12px; 
          padding: 20px; 
          margin-bottom: 30px; 
          border-left: 4px solid #28a745; 
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 10px; 
          padding-bottom: 10px; 
          border-bottom: 1px solid #e9ecef; 
        }
        .detail-row:last-child { border-bottom: none; margin-bottom: 0; }
        .detail-label { font-weight: 600; color: #6c757d; }
        .detail-value { color: #2c3e50; font-weight: 500; }
        .amount { color: #28a745; font-weight: 700; font-size: 18px; }
        .upload-section { 
          background: #fff; 
          border: 2px dashed #28a745; 
          border-radius: 12px; 
          padding: 30px; 
          text-align: center; 
          margin-bottom: 30px; 
        }
        .file-input { 
          margin: 20px 0; 
          padding: 12px; 
          border: 1px solid #ddd; 
          border-radius: 8px; 
          width: 100%; 
          font-size: 16px; 
        }
        .submit-btn { 
          background: linear-gradient(135deg, #28a745, #20c997); 
          color: white; 
          border: none; 
          padding: 15px 30px; 
          border-radius: 8px; 
          font-size: 16px; 
          font-weight: 600; 
          cursor: pointer; 
          width: 100%; 
          transition: all 0.3s ease; 
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .notes { 
          background: #fff3cd; 
          border: 1px solid #ffeaa7; 
          border-radius: 8px; 
          padding: 20px; 
          color: #856404; 
          margin-top: 20px; 
        }
        .success-message { 
          background: #d4edda; 
          border: 1px solid #c3e6cb; 
          border-radius: 8px; 
          padding: 20px; 
          color: #155724; 
          margin-bottom: 20px; 
          display: none; 
        }
        .error-message { 
          background: #f8d7da; 
          border: 1px solid #f5c6cb; 
          border-radius: 8px; 
          padding: 20px; 
          color: #721c24; 
          margin-bottom: 20px; 
          display: none; 
        }
        .spinner { 
          border: 3px solid #f3f3f3; 
          border-top: 3px solid #28a745; 
          border-radius: 50%; 
          width: 20px; 
          height: 20px; 
          animation: spin 1s linear infinite; 
          display: inline-block; 
          margin-right: 10px; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) { .container { margin: 10px; } .content { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Fund Retirement Portal</h1>
          <p>Upload your retirement documentation</p>
        </div>
        
        <div class="content">
          <div id="successMessage" class="success-message">
            ✅ <strong>Success!</strong> Your retirement documents have been uploaded successfully and sent for approval.
          </div>
          
          <div id="errorMessage" class="error-message">
            ❌ <strong>Error:</strong> <span id="errorText"></span>
          </div>
          
          <div class="request-details">
            <h3 style="margin-bottom: 20px; color: #2c3e50;">📋 Request Details</h3>
            <div class="detail-row">
              <span class="detail-label">Purpose:</span>
              <span class="detail-value">${request.purpose}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Requester:</span>
              <span class="detail-value">${request.requester_name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value amount">${getCurrencySymbol(
                request.currency
              )} ${request.amount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Department:</span>
              <span class="detail-value">${
                request.department || "Not specified"
              }</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Approval Token:</span>
              <span class="detail-value" style="font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${
                request.approval_token
              }</span>
            </div>
          </div>
          
          <form id="retirementForm" enctype="multipart/form-data">
            <div class="upload-section">
              <h3 style="color: #28a745; margin-bottom: 15px;">📎 Upload Retirement Documents</h3>
              <p style="color: #6c757d; margin-bottom: 20px;">
                Please upload receipts, invoices, or other documentation that proves the funds were used for the approved purpose.
              </p>
              <input type="file" id="documents" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="file-input" required>
              <p style="font-size: 12px; color: #6c757d; margin-top: 10px;">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB per file)
              </p>
            </div>
            
            <button type="submit" class="submit-btn" id="submitBtn">
              📤 Submit Retirement Documentation
            </button>
            
            <input type="hidden" name="requestId" value="${request._id}">
            <input type="hidden" name="token" value="${request.approval_token}">
          </form>
          
          <div class="notes">
            <h4 style="margin-bottom: 10px;">📝 Important Notes:</h4>
            <ul style="margin-left: 20px; line-height: 1.6;">
              <li>Upload all receipts and invoices related to this fund request</li>
              <li>Make sure documents are clear and readable</li>
              <li>Once submitted, your approver will be notified via email</li>
              <li>You will receive confirmation once the retirement is approved</li>
            </ul>
          </div>
        </div>
      </div>

      <script>
        document.getElementById('retirementForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const submitBtn = document.getElementById('submitBtn');
          const successMsg = document.getElementById('successMessage');
          const errorMsg = document.getElementById('errorMessage');
          const errorText = document.getElementById('errorText');
          
          // Hide previous messages
          successMsg.style.display = 'none';
          errorMsg.style.display = 'none';
          
          // Show loading state
          submitBtn.innerHTML = '<div class="spinner"></div>Uploading...';
          submitBtn.disabled = true;
          
          try {
            const formData = new FormData(this);
            
            const response = await fetch('/api/submit-retirement', {
              method: 'POST',
              body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
              successMsg.style.display = 'block';
              this.style.display = 'none'; // Hide the form
            } else {
              throw new Error(result.message || 'Upload failed');
            }
            
          } catch (error) {
            errorText.textContent = error.message;
            errorMsg.style.display = 'block';
          } finally {
            submitBtn.innerHTML = '📤 Submit Retirement Documentation';
            submitBtn.disabled = false;
          }
        });
        
        // File validation
        document.getElementById('documents').addEventListener('change', function(e) {
          const files = Array.from(e.target.files);
          const maxSize = 10 * 1024 * 1024; // 10MB
          const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
          
          let hasError = false;
          let errorMessage = '';
          
          files.forEach(file => {
            if (file.size > maxSize) {
              hasError = true;
              errorMessage = 'One or more files exceed the 10MB limit.';
              return;
            }
            
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedTypes.includes(extension)) {
              hasError = true;
              errorMessage = 'One or more files have unsupported format.';
              return;
            }
          });
          
          if (hasError) {
            document.getElementById('errorText').textContent = errorMessage;
            document.getElementById('errorMessage').style.display = 'block';
            e.target.value = ''; // Clear the input
          } else {
            document.getElementById('errorMessage').style.display = 'none';
          }
        });
      </script>
    </body>
    </html>
  `;
}

// API Routes
app.get("/api/requests", checkMongoConnection, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      urgent,
      department,
      currency,
      sort = "-created_at",
      search,
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (urgent !== undefined) filter.urgent = urgent === "true";
    if (department) filter.department = new RegExp(department, "i");
    if (currency) filter.currency = currency;

    // Search across multiple fields
    if (search) {
      filter.$or = [
        { requester_name: new RegExp(search, "i") },
        { purpose: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { requester_email: new RegExp(search, "i") },
      ];
    }

    const requests = await FundRequest.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await FundRequest.countDocuments(filter);

    res.json({
      requests,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRequests: total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time statistics with currency filtering
app.get("/api/stats", checkMongoConnection, async (req, res) => {
  try {
    const { currency } = req.query;
    const filter = currency ? { currency } : {};

    const stats = await Promise.all([
      FundRequest.countDocuments({ ...filter, status: "pending" }),
      FundRequest.countDocuments({ ...filter, status: "approved" }),
      FundRequest.countDocuments({
        ...filter,
        status: "rejected",
      }),
      FundRequest.countDocuments({ ...filter, urgent: true }),
      FundRequest.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      FundRequest.aggregate([
        { $match: { ...filter, status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      FundRequest.countDocuments({
        ...filter,
        created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      FundRequest.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $cond: [{ $eq: ["$status", "rejected"] }, "rejected", "$status"],
            },
            count: { $sum: 1 },
          },
        },
      ]),
      FundRequest.aggregate([
        {
          $group: {
            _id: "$currency",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
            },
            approved: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
            },
            rejected: {
              $sum: {
                $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
    ]);

    const totalAmount = stats[4][0]?.total || 0;
    const approvedAmount = stats[5][0]?.total || 0;
    const selectedCurrency = currency || "All";

    res.json({
      pending: stats[0],
      approved: stats[1],
      rejected: stats[2],
      urgent: stats[3],
      totalAmount,
      approvedAmount,
      todayRequests: stats[6],
      statusBreakdown: stats[7],
      currencyBreakdown: stats[8],
      selectedCurrency,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recent activity (last 8 hours)
app.get("/api/recent", checkMongoConnection, async (req, res) => {
  try {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const recent = await FundRequest.find({
      updated_at: { $gte: eightHoursAgo },
    })
      .sort({ updated_at: -1 })
      .limit(10)
      .select(
        "requester_name purpose amount currency status created_at updated_at urgent"
      )
      .exec();

    res.json(recent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get individual request details
app.get("/api/requests/:id", async (req, res) => {
  try {
    const request = await FundRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update request status
app.patch("/api/requests/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;

    // Validate status
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Find and update the request
    const updatedRequest = await FundRequest.findByIdAndUpdate(
      id,
      {
        status,
        updated_at: new Date(),
        ...(comments && { comments: comments }),
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    console.log(`Status updated for request ${id}: ${status}`);

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Delete request
app.delete("/api/requests/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the request
    const deletedRequest = await FundRequest.findByIdAndDelete(id);

    if (!deletedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    console.log(`Request deleted: ${id} - ${deletedRequest.requester_name}`);

    res.json({
      success: true,
      message: "Request deleted successfully",
      deletedRequest: {
        id: deletedRequest._id,
        requester_name: deletedRequest.requester_name,
        purpose: deletedRequest.purpose,
        amount: deletedRequest.amount,
      },
    });
  } catch (error) {
    console.error("Error deleting request:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Send PDF to approver
app.post("/api/send-pdf-to-approver", async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    const request = await FundRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Validate email configuration
    if (
      !process.env.EMAIL_HOST ||
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS
    ) {
      return res.status(500).json({
        error: "Email service not configured",
        message:
          "Missing email configuration. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.",
      });
    }

    // Import EmailService from the main backend
    const emailServicePath = path.join(__dirname, "./utils/emailService.js");
    const emailService = require(emailServicePath);

    // Verify email connection first
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      return res.status(500).json({
        error: "Email service unavailable",
        message:
          "Unable to connect to email server. Please check your email configuration and network connection.",
      });
    }

    // Generate PDF for the request
    const pdfBuffer = await generateRequestPDF(request, request.status);

    // Send PDF email to approver with the generated PDF
    await emailService.sendApprovalDecisionPDF(
      request,
      request.status,
      {
        email: request.approver_email,
        name: "System Administrator",
      },
      pdfBuffer
    );

    res.json({
      message: "PDF documentation sent successfully to approver",
      approverEmail: request.approver_email,
    });
  } catch (error) {
    console.error("Error sending PDF to approver:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to send PDF documentation";
    if (error.message.includes("ECONNREFUSED")) {
      errorMessage =
        "Unable to connect to email server. Please check your network connection and email server settings.";
    } else if (error.message.includes("authentication")) {
      errorMessage =
        "Email authentication failed. Please check your email credentials.";
    } else if (error.message.includes("Invalid login")) {
      errorMessage =
        "Invalid email credentials. Please verify your email username and password.";
    }

    res.status(500).json({
      error: errorMessage,
      message: error.message,
    });
  }
});

// Send retirement notice to requester
app.post(
  "/api/send-retirement-notice",
  checkMongoConnection,
  async (req, res) => {
    try {
      const { requestId } = req.body;

      if (!requestId) {
        return res.status(400).json({ error: "Request ID is required" });
      }

      const request = await FundRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.status !== "approved") {
        return res.status(400).json({
          error: "Can only send retirement notice for approved requests",
        });
      }

      // Validate email configuration
      if (
        !process.env.EMAIL_HOST ||
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS
      ) {
        console.error("❌ Email service not configured properly");
        console.error(
          "📧 EMAIL_HOST:",
          process.env.EMAIL_HOST ? "✅ SET" : "❌ MISSING"
        );
        console.error(
          "📧 EMAIL_USER:",
          process.env.EMAIL_USER ? "✅ SET" : "❌ MISSING"
        );
        console.error(
          "📧 EMAIL_PASS:",
          process.env.EMAIL_PASS ? "✅ SET" : "❌ MISSING"
        );

        return res.status(500).json({
          error: "Email service not configured",
          message:
            "Missing email configuration. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.",
        });
      }

      console.log(
        `📧 [Request ID: ${requestId}] Preparing to send retirement notice to: ${request.requester_email}`
      );
      console.log(
        `📧 Email config - Host: ${process.env.EMAIL_HOST}, Port: ${process.env.EMAIL_PORT}, Secure: ${process.env.EMAIL_SECURE}`
      );

      // Import EmailService from the main backend
      const emailServicePath = path.join(__dirname, "./utils/emailService.js");
      const emailService = require(emailServicePath);

      // Create retirement email content
      const retirementEmailOptions = {
        from: process.env.EMAIL_USER,
        to: request.requester_email,
        subject: `💰 Fund Retirement Notice - ${request.purpose}`,
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fund Retirement Notice</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f8f0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f8f0; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 30px 40px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
                      <h1 style="color: #333333; margin: 0; font-size: 26px; font-weight: 600;">
                        Fund Retirement Notice
                      </h1>
                      <p style="color: #666666; margin: 8px 0 0 0; font-size: 16px;">
                        Time to retire your approved funds
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Dear <strong>${request.requester_name}</strong>,
                      </p>
                      
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Your fund request has been approved and is ready for retirement. Please upload your retirement confirmation documents using the link below.
                      </p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${
                          process.env.DASHBOARD_URL || "http://localhost:3001"
                        }/retire?token=${request.approval_token}&id=${
          request._id
        }" 
                           style="background: linear-gradient(135deg, #28a745, #20c997); 
                                  color: white; 
                                  padding: 15px 30px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: 600; 
                                  font-size: 16px; 
                                  display: inline-block;
                                  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
                                  transition: all 0.3s ease;">
                          🔗 Upload Retirement Documents
                        </a>
                      </div>
                      
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">Request Details:</h3>
                        <table width="100%" style="color: #333333;">
                          <tr>
                            <td style="padding: 5px 0; font-weight: 600;">Purpose:</td>
                            <td style="padding: 5px 0;">${request.purpose}</td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; font-weight: 600;">Amount:</td>
                            <td style="padding: 5px 0; color: #28a745; font-weight: 700; font-size: 18px;">
                              ${emailService.formatCurrency(
                                request.amount,
                                request.currency
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; font-weight: 600;">Approval Token:</td>
                            <td style="padding: 5px 0; font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px;">
                              ${request.approval_token}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; font-weight: 600;">Approved Date:</td>
                            <td style="padding: 5px 0;">${
                              request.approved_at
                                ? new Date(
                                    request.approved_at
                                  ).toLocaleDateString()
                                : "Recently"
                            }</td>
                          </tr>
                        </table>
                      </div>
                      
                      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="color: #856404; margin: 0; font-size: 14px;">
                          <strong>Next Steps:</strong> 
                          <br>1. Click the link above to access the retirement portal
                          <br>2. Upload required documents (receipts, invoices, etc.)
                          <br>3. Submit for final approval
                          <br><br><strong>Support:</strong> Contact the finance department if you need assistance with the retirement process.
                        </p>
                      </div>
                      
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-top: 25px;">
                        Thank you for using the Fund Request System.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                      <p style="color: #bdc3c7; margin: 0; font-size: 14px; line-height: 1.5;">
                        🤖 This is an automated notice from the Fund Request System.<br>
                        Please do not reply to this email. For support, contact your system administrator.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      };

      // Send the email using the email service
      console.log(
        `📧 [Request ID: ${requestId}] Starting email send process...`
      );
      await emailService.sendEmailWithRetry(
        retirementEmailOptions,
        3,
        requestId
      );

      // Update request status to indicate retirement notice was sent
      await FundRequest.findByIdAndUpdate(requestId, {
        retirement_status: "notice_sent",
        retirement_notice_sent_date: new Date(),
      });

      console.log(
        `✅ [Request ID: ${requestId}] Retirement notice sent successfully to: ${request.requester_email}`
      );
      res.json({
        message: "Retirement notice sent successfully to requester",
        requesterEmail: request.requester_email,
        requestId: requestId,
      });
    } catch (error) {
      console.error(
        `❌ [Request ID: ${requestId}] Error sending retirement notice:`,
        error
      );

      // Provide more specific error response based on error type
      let errorMessage = error.message;
      let errorCode = "EMAIL_SEND_FAILED";

      if (
        error.message.includes("Connection timeout") ||
        error.message.includes("ETIMEDOUT")
      ) {
        errorCode = "EMAIL_TIMEOUT";
        errorMessage =
          "Email service timed out. This may be due to network connectivity or SMTP server issues.";
      } else if (error.message.includes("EAUTH")) {
        errorCode = "EMAIL_AUTH_FAILED";
        errorMessage =
          "Email authentication failed. Please check email credentials.";
      } else if (error.message.includes("ECONNECTION")) {
        errorCode = "EMAIL_CONNECTION_FAILED";
        errorMessage =
          "Could not connect to email server. Please check network connectivity.";
      }

      res.status(500).json({
        error: "Failed to send retirement notice",
        message: errorMessage,
        errorCode: errorCode,
        requestId: requestId,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// Department breakdown
app.get("/api/departments", checkMongoConnection, async (req, res) => {
  try {
    const departments = await FundRequest.aggregate([
      { $match: { department: { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export data endpoint
app.get("/api/export", async (req, res) => {
  try {
    const { format, status, currency, search, limit = 10000 } = req.query;

    // Build filter
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (currency) {
      filter.currency = currency;
    }
    if (search) {
      filter.$or = [
        { requester_name: { $regex: search, $options: "i" } },
        { approver_email: { $regex: search, $options: "i" } },
        { purpose: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Get requests data
    const requests = await FundRequest.find(filter)
      .limit(parseInt(limit))
      .sort({ created_at: -1 })
      .lean();

    if (format === "pdf") {
      // PDF Export - Professional Document Style
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
        info: {
          Title: "Fund Requests Report",
          Author: "Fund Request Dashboard",
          Subject: "Fund Requests Export",
          Keywords: "fund requests, export, report",
        },
      });

      // Set response headers for PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fund-requests-report-${Date.now()}.pdf"`
      );

      // Pipe the PDF to response
      doc.pipe(res);

      // Helper function to draw a colored box
      const drawBox = (x, y, width, height, color, radius = 5) => {
        doc
          .roundedRect(x, y, width, height, radius)
          .fillAndStroke(color, "#cccccc")
          .stroke();
      };

      // Helper function to add a section header
      const addSectionHeader = (text, icon = "") => {
        const y = doc.y;
        doc.roundedRect(50, y, 495, 35, 5).fillAndStroke("#1a1a3a", "#1a1a3a");

        doc
          .fillColor("#ffffff")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(`${text}`, 60, y + 11);

        doc.moveDown(1.5);
      };

      // Helper function to add a labeled field with nice formatting
      const addField = (label, value, options = {}) => {
        const y = doc.y;
        const leftMargin = options.indent ? 70 : 60;

        // Label
        doc
          .fillColor("#666666")
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(label + ":", leftMargin, y, { continued: false });

        // Value
        doc
          .fillColor(options.color || "#000000")
          .fontSize(10)
          .font(options.bold ? "Helvetica-Bold" : "Helvetica")
          .text(value, leftMargin + 120, y, {
            width: 365,
            align: "left",
          });

        doc.moveDown(0.6);
      };

      // Helper function to add status badge
      const addStatusBadge = (status) => {
        const statusColors = {
          approved: { bg: "#d4edda", text: "#155724", label: "APPROVED" },
          rejected: { bg: "#f8d7da", text: "#721c24", label: "REJECTED" },
          pending: { bg: "#fff3cd", text: "#856404", label: "PENDING" },
        };

        const config =
          statusColors[status.toLowerCase()] || statusColors.pending;
        const x = 400;
        const y = doc.y;

        doc.roundedRect(x, y - 2, 145, 20, 3).fill(config.bg);

        doc
          .fillColor(config.text)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(config.label, x + 5, y + 2, {
            width: 135,
            align: "center",
          });
      };

      // ============================================
      // COVER PAGE
      // ============================================

      // Header with gradient effect (simulated with rectangles)
      doc.rect(0, 0, 612, 180).fill("#1a1a3a");
      doc.rect(0, 140, 612, 40).fill("#2d2d5f");

      // Title
      doc
        .fillColor("#ffffff")
        .fontSize(32)
        .font("Helvetica-Bold")
        .text("FUND REQUESTS", 50, 50, { align: "center" });

      doc.fontSize(28).text("EXPORT REPORT", 50, 90, { align: "center" });

      // Decorative line
      doc
        .moveTo(200, 135)
        .lineTo(412, 135)
        .lineWidth(2)
        .strokeColor("#00d4aa")
        .stroke();

      // Report metadata box
      doc.y = 220;
      doc
        .roundedRect(100, 220, 412, 120, 8)
        .fillAndStroke("#f8f9fa", "#dee2e6");

      doc.fillColor("#1a1a3a").fontSize(12).font("Helvetica");

      const reportDate = new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc
        .text("Export Date:", 130, 245, { continued: true })
        .font("Helvetica-Bold")
        .text(` ${reportDate}`, { continued: false });

      doc
        .font("Helvetica")
        .text("Total Records:", 130, 270, { continued: true })
        .font("Helvetica-Bold")
        .text(` ${requests.length}`, { continued: false });

      doc
        .font("Helvetica")
        .text("Filters Applied:", 130, 295, { continued: true })
        .font("Helvetica-Bold");

      let filterText = "None";
      if (status || currency || search) {
        const filters = [];
        if (status) filters.push(`Status: ${status}`);
        if (currency) filters.push(`Currency: ${currency}`);
        if (search) filters.push(`Search: "${search}"`);
        filterText = filters.join(", ");
      }
      doc.text(` ${filterText}`, { continued: false, width: 350 });

      // Footer on cover page
      doc
        .fillColor("#666666")
        .fontSize(10)
        .font("Helvetica")
        .text("Generated by Fund Request Dashboard", 50, 750, {
          align: "center",
        })
        .text("Confidential - For Internal Use Only", 50, 765, {
          align: "center",
        });

      // ============================================
      // SUMMARY PAGE
      // ============================================

      if (requests.length > 0) {
        doc.addPage();

        // Page title
        doc
          .fillColor("#1a1a3a")
          .fontSize(20)
          .font("Helvetica-Bold")
          .text("EXECUTIVE SUMMARY", 50, 50);

        doc
          .moveTo(50, 78)
          .lineTo(545, 78)
          .lineWidth(2)
          .strokeColor("#00d4aa")
          .stroke();

        doc.moveDown(2);

        // Calculate statistics
        const stats = {
          total: requests.length,
          approved: requests.filter((r) => r.status === "approved").length,
          rejected: requests.filter((r) => r.status === "rejected").length,
          pending: requests.filter((r) => r.status === "pending").length,
          urgent: requests.filter((r) => r.urgent).length,
          totalAmount: {},
        };

        // Calculate total amounts by currency
        requests.forEach((r) => {
          if (!stats.totalAmount[r.currency]) {
            stats.totalAmount[r.currency] = 0;
          }
          stats.totalAmount[r.currency] += r.amount;
        });

        // Statistics boxes
        const boxWidth = 115;
        const boxHeight = 80;
        const startX = 60;
        let currentY = 110;

        // Row 1 - Status Distribution
        // Approved
        doc
          .roundedRect(startX, currentY, boxWidth, boxHeight, 5)
          .fillAndStroke("#d4edda", "#c3e6cb");
        doc
          .fillColor("#155724")
          .fontSize(28)
          .font("Helvetica-Bold")
          .text(stats.approved.toString(), startX, currentY + 15, {
            width: boxWidth,
            align: "center",
          });
        doc
          .fontSize(11)
          .font("Helvetica")
          .text("Approved", startX, currentY + 50, {
            width: boxWidth,
            align: "center",
          });

        // Rejected
        doc
          .roundedRect(startX + 130, currentY, boxWidth, boxHeight, 5)
          .fillAndStroke("#f8d7da", "#f5c6cb");
        doc
          .fillColor("#721c24")
          .fontSize(28)
          .font("Helvetica-Bold")
          .text(stats.rejected.toString(), startX + 130, currentY + 15, {
            width: boxWidth,
            align: "center",
          });
        doc
          .fontSize(11)
          .font("Helvetica")
          .text("Rejected", startX + 130, currentY + 50, {
            width: boxWidth,
            align: "center",
          });

        // Pending
        doc
          .roundedRect(startX + 260, currentY, boxWidth, boxHeight, 5)
          .fillAndStroke("#fff3cd", "#ffeaa7");
        doc
          .fillColor("#856404")
          .fontSize(28)
          .font("Helvetica-Bold")
          .text(stats.pending.toString(), startX + 260, currentY + 15, {
            width: boxWidth,
            align: "center",
          });
        doc
          .fontSize(11)
          .font("Helvetica")
          .text("Pending", startX + 260, currentY + 50, {
            width: boxWidth,
            align: "center",
          });

        // Urgent
        doc
          .roundedRect(startX + 390, currentY, boxWidth, boxHeight, 5)
          .fillAndStroke("#f8d7da", "#f5c6cb");
        doc
          .fillColor("#721c24")
          .fontSize(28)
          .font("Helvetica-Bold")
          .text(stats.urgent.toString(), startX + 390, currentY + 15, {
            width: boxWidth,
            align: "center",
          });
        doc
          .fontSize(11)
          .font("Helvetica")
          .text("Urgent", startX + 390, currentY + 50, {
            width: boxWidth,
            align: "center",
          });

        // Total Amount Summary
        currentY += 110;
        doc
          .fillColor("#1a1a3a")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Total Amount by Currency", 60, currentY);

        currentY += 30;
        Object.keys(stats.totalAmount).forEach((currency, idx) => {
          const amount = stats.totalAmount[currency];
          doc
            .roundedRect(60, currentY + idx * 45, 485, 38, 5)
            .fillAndStroke("#e9ecef", "#dee2e6");

          doc
            .fillColor("#495057")
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(currency, 80, currentY + idx * 45 + 12);

          doc
            .fillColor("#1a1a3a")
            .fontSize(16)
            .font("Helvetica-Bold")
            .text(amount.toLocaleString(), 200, currentY + idx * 45 + 10, {
              align: "right",
              width: 320,
            });
        });
      }

      // ============================================
      // DETAILED REQUESTS PAGES
      // ============================================

      requests.forEach((request, index) => {
        doc.addPage();

        // Page header with request number
        doc.roundedRect(50, 40, 495, 40, 5).fillAndStroke("#f8f9fa", "#dee2e6");

        doc
          .fillColor("#1a1a3a")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(`Request #${index + 1} of ${requests.length}`, 65, 52);

        // Status badge in header
        doc.save();
        doc.y = 52;
        addStatusBadge(request.status);
        doc.restore();

        doc.y = 95;

        // ============================================
        // REQUESTER INFORMATION
        // ============================================
        addSectionHeader("REQUESTER INFORMATION");

        addField("Full Name", request.requester_name, { bold: true });
        addField("Email Address", request.requester_email);
        if (request.department) {
          addField("Department", request.department);
        }

        doc.moveDown(0.5);

        // ============================================
        // REQUEST DETAILS
        // ============================================
        addSectionHeader("REQUEST DETAILS");

        addField("Purpose", request.purpose, { bold: true, color: "#1a1a3a" });

        if (request.description) {
          const y = doc.y;
          doc
            .fillColor("#666666")
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("Description:", 60, y);

          doc
            .fillColor("#000000")
            .fontSize(10)
            .font("Helvetica")
            .text(request.description, 60, y + 15, {
              width: 485,
              align: "justify",
            });

          doc.moveDown(1);
        }

        doc.moveDown(0.5);

        // ============================================
        // FINANCIAL INFORMATION
        // ============================================
        addSectionHeader("FINANCIAL INFORMATION");

        // Highlighted amount box
        const amountY = doc.y;
        doc
          .roundedRect(60, amountY, 485, 50, 5)
          .fillAndStroke("#e7f3ff", "#b3d9ff");

        doc
          .fillColor("#004085")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("REQUESTED AMOUNT", 80, amountY + 10);

        doc
          .fillColor("#002752")
          .fontSize(22)
          .font("Helvetica-Bold")
          .text(
            `${request.currency} ${request.amount.toLocaleString()}`,
            80,
            amountY + 26
          );

        doc.moveDown(3);

        addField("Currency", request.currency);
        addField("Priority", request.urgent ? "URGENT" : "Normal", {
          bold: request.urgent,
          color: request.urgent ? "#dc3545" : "#28a745",
        });

        doc.moveDown(0.5);

        // ============================================
        // APPROVAL INFORMATION
        // ============================================
        addSectionHeader("APPROVAL INFORMATION");

        addField("Approver Email", request.approver_email);
        addField("Current Status", request.status.toUpperCase(), {
          bold: true,
          color:
            request.status === "approved"
              ? "#28a745"
              : request.status === "rejected"
              ? "#dc3545"
              : "#ffc107",
        });

        doc.moveDown(0.5);

        // ============================================
        // TIMELINE INFORMATION
        // ============================================
        addSectionHeader("TIMELINE");

        addField(
          "Created",
          new Date(request.created_at).toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );

        if (request.approved_at) {
          addField(
            "Approved",
            new Date(request.approved_at).toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            { color: "#28a745" }
          );
        }

        if (request.rejected_at) {
          addField(
            "Rejected",
            new Date(request.rejected_at).toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            { color: "#dc3545" }
          );
        }

        // ============================================
        // FOOTER WITH METADATA
        // ============================================
        doc
          .fontSize(8)
          .fillColor("#999999")
          .font("Helvetica")
          .text(`Document ID: ${request._id}`, 50, 750)
          .text(`Page ${index + 3} of ${requests.length + 2}`, 50, 760, {
            align: "right",
          });
      });

      // ============================================
      // ADD PAGE NUMBERS TO ALL PAGES
      // ============================================
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        // Skip page numbers on cover page
        if (i === 0) continue;

        doc
          .fontSize(8)
          .fillColor("#999999")
          .font("Helvetica")
          .text(`Page ${i + 1} of ${pages.count}`, 50, 760, {
            align: "center",
            width: 495,
          });
      }

      doc.end();
    } else if (format === "excel") {
      // Excel Export
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Fund Requests");

      // Set up columns
      worksheet.columns = [
        { header: "ID", key: "_id", width: 20 },
        { header: "Requester Name", key: "requester_name", width: 20 },
        { header: "Requester Email", key: "requester_email", width: 25 },
        { header: "Approver Email", key: "approver_email", width: 25 },
        { header: "Purpose", key: "purpose", width: 30 },
        { header: "Description", key: "description", width: 40 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Currency", key: "currency", width: 10 },
        { header: "Status", key: "status", width: 12 },
        { header: "Urgent", key: "urgent", width: 10 },
        { header: "Department", key: "department", width: 15 },
        { header: "Created At", key: "created_at", width: 20 },
        { header: "Approved At", key: "approved_at", width: 20 },
        { header: "Rejected At", key: "rejected_at", width: 20 },
      ];

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF366092" },
      };

      // Add data rows
      requests.forEach((request) => {
        worksheet.addRow({
          ...request,
          urgent: request.urgent ? "Yes" : "No",
          created_at: new Date(request.created_at).toLocaleString(),
          approved_at: request.approved_at
            ? new Date(request.approved_at).toLocaleString()
            : "",
          rejected_at: request.rejected_at
            ? new Date(request.rejected_at).toLocaleString()
            : "",
        });
      });

      // Set response headers for Excel
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fund-requests-${Date.now()}.xlsx"`
      );

      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      return res
        .status(400)
        .json({ error: "Invalid format. Use 'pdf' or 'excel'" });
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the dashboard HTML
// Submit retirement documents
app.post(
  "/api/submit-retirement",
  upload.array("documents", 10),
  async (req, res) => {
    try {
      const { requestId, token } = req.body;
      const files = req.files;

      if (!requestId || !token) {
        return res
          .status(400)
          .json({ error: "Request ID and token are required" });
      }

      if (!files || files.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one document is required" });
      }

      // Verify request exists and is approved
      const request = await FundRequest.findOne({
        _id: requestId,
        approval_token: token,
        status: "approved",
      });

      if (!request) {
        return res
          .status(404)
          .json({ error: "Request not found or invalid token" });
      }

      // Send notification to approver about the retirement submission
      try {
        const emailServicePath = path.join(
          __dirname,
          "./utils/emailService.js"
        );
        const emailService = require(emailServicePath);

        const retirementNotificationEmail = {
          from: process.env.EMAIL_USER,
          to: request.approver_email,
          subject: `📄 Retirement Documents Submitted - ${request.purpose}`,
          html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Retirement Documents Submitted</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #28a745, #20c997); padding: 30px 40px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">
                          Retirement Documents Submitted
                        </h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
                          ${
                            request.requester_name
                          } has submitted retirement documentation
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 30px 40px;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                          Dear Approver,
                        </p>
                        
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                          The requester has uploaded retirement documents for the approved fund request. Please review the submitted documentation and approve the final retirement.
                        </p>
                        
                        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                          <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">📋 Request Details:</h3>
                          <table width="100%" style="color: #333333;">
                            <tr>
                              <td style="padding: 5px 0; font-weight: 600;">Purpose:</td>
                              <td style="padding: 5px 0;">${
                                request.purpose
                              }</td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-weight: 600;">Requester:</td>
                              <td style="padding: 5px 0;">${
                                request.requester_name
                              } (${request.requester_email})</td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-weight: 600;">Amount:</td>
                              <td style="padding: 5px 0; color: #28a745; font-weight: 700; font-size: 18px;">
                                ${getCurrencySymbol(
                                  request.currency
                                )} ${request.amount.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-weight: 600;">Department:</td>
                              <td style="padding: 5px 0;">${
                                request.department || "Not specified"
                              }</td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-weight: 600;">Documents Submitted:</td>
                              <td style="padding: 5px 0;">${
                                files.length
                              } file(s)</td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-weight: 600;">Submission Date:</td>
                              <td style="padding: 5px 0;">${new Date().toLocaleString()}</td>
                            </tr>
                          </table>
                        </div>
                        
                        <div style="background-color: #e7f3ff; border: 1px solid #b3d7ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
                          <p style="color: #004085; margin: 0; font-size: 14px;">
                            <strong>📎 Uploaded Files:</strong>
                            <br>${files
                              .map(
                                (file) =>
                                  `• ${file.originalname} (${(
                                    file.size /
                                    1024 /
                                    1024
                                  ).toFixed(2)} MB)`
                              )
                              .join("<br>")}
                          </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${
                            process.env.DASHBOARD_URL || "http://localhost:3001"
                          }" 
                             style="background: linear-gradient(135deg, #007bff, #0056b3); 
                                    color: white; 
                                    padding: 15px 30px; 
                                    text-decoration: none; 
                                    border-radius: 8px; 
                                    font-weight: 600; 
                                    font-size: 16px; 
                                    display: inline-block;">
                            📊 Review in Dashboard
                          </a>
                        </div>
                        
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-top: 25px;">
                          Please review and approve the retirement at your earliest convenience.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                        <p style="color: #bdc3c7; margin: 0; font-size: 14px; line-height: 1.5;">
                          🤖 This is an automated notification from the Fund Request System.<br>
                          Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
        };

        await emailService.sendEmailWithRetry(retirementNotificationEmail);
      } catch (emailError) {
        console.error(
          "Error sending retirement notification email:",
          emailError
        );
        // Continue even if email fails - don't block the upload
      }

      // Convert files to base64 and store in MongoDB
      const documentsToStore = files.map((file) => ({
        filename: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${
          file.originalname
        }`,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        data: file.buffer.toString("base64"), // Convert buffer to base64 string
        uploadDate: new Date(),
      }));

      // Update request with retirement documents stored in MongoDB
      await FundRequest.findByIdAndUpdate(requestId, {
        retirement_status: "documents_submitted",
        retirement_documents: documentsToStore,
        retirement_submitted_date: new Date(),
        updated_at: new Date(),
      });

      console.log(
        `✅ Stored ${files.length} documents in MongoDB for request ${requestId}`
      );

      res.json({
        success: true,
        message: "Retirement documents uploaded successfully",
        filesUploaded: files.length,
        files: files.map((file) => ({
          originalName: file.originalname,
          size: file.size,
        })),
      });
    } catch (error) {
      console.error("Error processing retirement submission:", error);

      res.status(500).json({
        error: "Failed to process retirement submission",
        message: error.message,
      });
    }
  }
);

// Get retirement documents for a request
app.get(
  "/api/retirement-documents/:requestId",
  checkMongoConnection,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      const request = await FundRequest.findById(requestId).select(
        "retirement_documents requester_email approver_email"
      );

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (
        !request.retirement_documents ||
        request.retirement_documents.length === 0
      ) {
        return res
          .status(404)
          .json({ error: "No documents found for this request" });
      }

      // Return document list without the base64 data (for listing)
      const documentList = request.retirement_documents.map((doc) => ({
        filename: doc.filename,
        originalName: doc.originalName,
        mimetype: doc.mimetype,
        size: doc.size,
        uploadDate: doc.uploadDate,
      }));

      res.json({
        success: true,
        requestId: requestId,
        documents: documentList,
      });
    } catch (error) {
      console.error("Error fetching retirement documents:", error);
      res.status(500).json({
        error: "Failed to fetch documents",
        message: error.message,
      });
    }
  }
);

// Download a specific retirement document
app.get(
  "/api/retirement-documents/:requestId/:filename",
  checkMongoConnection,
  async (req, res) => {
    try {
      const { requestId, filename } = req.params;

      const request = await FundRequest.findById(requestId).select(
        "retirement_documents"
      );

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Find the specific document
      const document = request.retirement_documents.find(
        (doc) => doc.filename === filename
      );

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Convert base64 back to buffer
      const fileBuffer = Buffer.from(document.data, "base64");

      // Set appropriate headers
      res.setHeader("Content-Type", document.mimetype);
      res.setHeader("Content-Length", fileBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${document.originalName}"`
      );

      // Send the file
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({
        error: "Failed to download document",
        message: error.message,
      });
    }
  }
);

// ============================================
// EMAIL MANAGEMENT ROUTES
// ============================================

// Get all requests with email status for dashboard
app.get("/api/email-management", checkMongoConnection, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    // Build filter
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { requester_name: { $regex: search, $options: "i" } },
        { requester_email: { $regex: search, $options: "i" } },
        { approver_email: { $regex: search, $options: "i" } },
        { purpose: { $regex: search, $options: "i" } },
        { _id: { $regex: search, $options: "i" } },
      ];
    }

    // Get requests with pagination
    const requests = await FundRequest.find(filter)
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count
    const total = await FundRequest.countDocuments(filter);

    // Enhance requests with email status analysis
    const enhancedRequests = requests.map((request) => {
      // Calculate email status based on request lifecycle
      const emailStatus = {
        initialApprovalSent: false,
        confirmationSent: false,
        statusNotificationSent: false,
        needsInitialApproval: false,
        needsConfirmation: false,
        needsStatusNotification: false,
      };

      // Determine what emails should have been sent
      emailStatus.needsInitialApproval = request.status === "pending";
      emailStatus.needsConfirmation = request.status === "pending";
      emailStatus.needsStatusNotification = request.status !== "pending";

      // Note: In a real implementation, you'd track email sent status in the database
      // For now, we'll make educated guesses based on timestamps and status

      const timeSinceCreation =
        Date.now() - new Date(request.created_at).getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      // If request is older than 5 minutes and still pending, likely emails were sent
      if (timeSinceCreation > fiveMinutesInMs && request.status === "pending") {
        emailStatus.initialApprovalSent = true;
        emailStatus.confirmationSent = true;
      }

      // If request is approved/rejected, status notification should have been sent
      if (request.status !== "pending") {
        emailStatus.statusNotificationSent = true;
        emailStatus.initialApprovalSent = true;
        emailStatus.confirmationSent = true;
      }

      return {
        ...request,
        emailStatus,
        requestAge: Math.floor(timeSinceCreation / (1000 * 60)), // Age in minutes
        approvalUrl: `${(
          process.env.FRONTEND_URL || "https://your-frontend.com"
        ).replace(/\/$/, "")}/#/approve/${request.approval_token}`,
      };
    });

    res.json({
      requests: enhancedRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Email management fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Send approval email manually
app.post("/api/email-management/:requestId/send-approval", async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the request
    const request = await FundRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if request is in valid state for approval email
    if (request.status !== "pending") {
      return res.status(400).json({
        error: "Can only send approval emails for pending requests",
      });
    }

    // Import EmailService from the main backend
    const emailServicePath = path.join(__dirname, "./utils/emailService.js");
    const emailService = require(emailServicePath);

    // Convert request to the format expected by emailService
    const fundRequest = {
      id: request._id.toString(),
      requester_name: request.requester_name,
      requester_email: request.requester_email,
      approver_email: request.approver_email,
      purpose: request.purpose,
      description: request.description,
      amount: request.amount,
      currency: request.currency,
      urgent: request.urgent,
      approvalToken: request.approval_token,
      created_at: request.created_at,
    };

    // Send approval email
    const approvers = [{ email: request.approver_email }];
    await emailService.sendFundRequestNotification(fundRequest, approvers);

    res.json({
      success: true,
      message: "Approval email sent successfully",
      recipient: request.approver_email,
    });
  } catch (error) {
    console.error("Send approval email error:", error);
    res.status(500).json({
      error: "Failed to send approval email",
      message: error.message,
    });
  }
});

// Send confirmation email manually
app.post(
  "/api/email-management/:requestId/send-confirmation",
  async (req, res) => {
    try {
      const { requestId } = req.params;

      // Find the request
      const request = await FundRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Import EmailService from the main backend
      const emailServicePath = path.join(__dirname, "./utils/emailService.js");
      const emailService = require(emailServicePath);

      // Convert request to the format expected by emailService
      const requestData = {
        id: request._id.toString(),
        requester_name: request.requester_name,
        requester_email: request.requester_email,
        approver_email: request.approver_email,
        purpose: request.purpose,
        description: request.description,
        amount: request.amount,
        currency: request.currency,
        urgent: request.urgent,
        approval_token: request.approval_token,
        created_at: request.created_at,
      };

      // Send confirmation email
      await emailService.sendConfirmationEmail(requestData);

      res.json({
        success: true,
        message: "Confirmation email sent successfully",
        recipient: request.requester_email,
      });
    } catch (error) {
      console.error("Send confirmation email error:", error);
      res.status(500).json({
        error: "Failed to send confirmation email",
        message: error.message,
      });
    }
  }
);

// Send status notification email manually
app.post("/api/email-management/:requestId/send-status", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approverName, comments } = req.body;

    // Find the request
    const request = await FundRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if request has been processed
    if (request.status === "pending") {
      return res.status(400).json({
        error: "Cannot send status notification for pending requests",
      });
    }

    // Import EmailService from the main backend
    const emailServicePath = path.join(__dirname, "./utils/emailService.js");
    const emailService = require(emailServicePath);

    // Convert request to the format expected by emailService
    const fundRequest = {
      id: request._id.toString(),
      requester_name: request.requester_name,
      requester_email: request.requester_email,
      approver_email: request.approver_email,
      purpose: request.purpose,
      description: request.description,
      amount: request.amount,
      currency: request.currency,
      urgent: request.urgent,
      status: request.status,
      created_at: request.created_at,
    };

    // Send status notification
    const approver =
      approverName || request.approved_by || request.rejected_by || "System";
    const notification_comments = comments || request.rejection_reason || "";

    await emailService.sendStatusNotification(
      fundRequest,
      request.status,
      approver,
      notification_comments
    );

    res.json({
      success: true,
      message: `${request.status} notification sent successfully`,
      recipient: request.requester_email,
    });
  } catch (error) {
    console.error("Send status notification error:", error);
    res.status(500).json({
      error: "Failed to send status notification",
      message: error.message,
    });
  }
});

// Test email configuration
app.post("/api/email-management/test-config", async (req, res) => {
  try {
    // Import EmailService from the main backend
    const emailServicePath = path.join(__dirname, "./utils/emailService.js");
    const emailService = require(emailServicePath);

    // Test SMTP connection
    const isConnected = await emailService.verifyConnection();

    if (isConnected) {
      res.json({
        success: true,
        message: "Email configuration is working correctly",
        config: {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          user: process.env.EMAIL_USER,
          secure: process.env.EMAIL_SECURE,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Email configuration test failed",
      });
    }
  } catch (error) {
    console.error("Email config test error:", error);
    res.status(500).json({
      success: false,
      error: "Email configuration test failed",
      message: error.message,
    });
  }
});

// Dashboard homepage (protected)
app.get("/", authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
