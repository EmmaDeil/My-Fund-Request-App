const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const PDFDocument = require("pdfkit");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Retirement portal page
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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    console.log(
      `📊 Dashboard will monitor database: ${
        process.env.MONGODB_URI.split("@")[1]?.split("/")[0] || "local"
      }`
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("");
    console.error("💡 Common solutions:");
    console.error("  - Verify MONGODB_URI is correct in .env file");
    console.error("  - Check if MongoDB service is running (for local)");
    console.error("  - Verify network access (for MongoDB Atlas)");
    console.error("  - Check username/password are correct (for Atlas)");
    process.exit(1);
  });

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
      .text("© 2025 Fund Request Management System - Confidential Document", {
        align: "center",
      });

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

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
app.get("/api/requests", async (req, res) => {
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
app.get("/api/stats", async (req, res) => {
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
app.get("/api/recent", async (req, res) => {
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
    const emailServicePath = path.join(
      __dirname,
      "../backend/utils/emailService.js"
    );
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
app.post("/api/send-retirement-notice", async (req, res) => {
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
      return res.status(500).json({
        error: "Email service not configured",
        message:
          "Missing email configuration. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.",
      });
    }

    // Import EmailService from the main backend
    const emailServicePath = path.join(
      __dirname,
      "../backend/utils/emailService.js"
    );
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
    await emailService.sendEmailWithRetry(retirementEmailOptions);

    res.json({
      message: "Retirement notice sent successfully to requester",
      requesterEmail: request.requester_email,
    });
  } catch (error) {
    console.error("Error sending retirement notice:", error);
    res.status(500).json({
      error: "Failed to send retirement notice",
      message: error.message,
    });
  }
});

// Department breakdown
app.get("/api/departments", async (req, res) => {
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
      // PDF Export
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers for PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fund-requests-${Date.now()}.pdf"`
      );

      // Pipe the PDF to response
      doc.pipe(res);

      // Add title
      doc.fontSize(20).text("Fund Requests Export", { align: "center" });
      doc.moveDown();

      // Add metadata
      doc.fontSize(12).text(`Export Date: ${new Date().toLocaleString()}`, {
        align: "right",
      });
      doc.text(`Total Records: ${requests.length}`, { align: "right" });
      doc.moveDown();

      // Add data
      requests.forEach((request, index) => {
        if (index > 0) doc.addPage();

        doc.fontSize(14).text(`Request #${index + 1}`, { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(10);
        doc.text(`Requester: ${request.requester_name}`);
        doc.text(`Email: ${request.requester_email}`);
        doc.text(`Approver: ${request.approver_email}`);
        doc.text(`Purpose: ${request.purpose}`);
        if (request.description)
          doc.text(`Description: ${request.description}`);
        doc.text(
          `Amount: ${request.currency} ${request.amount.toLocaleString()}`
        );
        doc.text(`Status: ${request.status.toUpperCase()}`);
        doc.text(`Urgent: ${request.urgent ? "Yes" : "No"}`);
        if (request.department) doc.text(`Department: ${request.department}`);
        doc.text(`Created: ${new Date(request.created_at).toLocaleString()}`);
        if (request.approved_at)
          doc.text(
            `Approved: ${new Date(request.approved_at).toLocaleString()}`
          );
        if (request.rejected_at)
          doc.text(
            `Rejected: ${new Date(request.rejected_at).toLocaleString()}`
          );
      });

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
          "../backend/utils/emailService.js"
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

      // Update request status to indicate retirement documents are submitted
      await FundRequest.findByIdAndUpdate(requestId, {
        retirement_status: "documents_submitted",
        retirement_documents: files.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          uploadDate: new Date(),
        })),
        updated_at: new Date(),
      });

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

      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach((file) => {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
          }
        });
      }

      res.status(500).json({
        error: "Failed to process retirement submission",
        message: error.message,
      });
    }
  }
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Database Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 Real-time fund request monitoring active`);
});

module.exports = app;
