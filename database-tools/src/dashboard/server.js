const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);

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
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        error: "Email service not configured",
        message: "Missing email configuration. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.",
      });
    }

    // Import EmailService from the main backend
    const emailServicePath = path.join(
      __dirname,
      "../../../backend/utils/emailService.js"
    );
    const emailService = require(emailServicePath);

    // Verify email connection first
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      return res.status(500).json({
        error: "Email service unavailable",
        message: "Unable to connect to email server. Please check your email configuration and network connection.",
      });
    }

    // Send PDF email to approver
    await emailService.sendApprovalDecisionPDF(request, request.status, {
      email: request.approver_email,
      name: "System Administrator",
    });

    res.json({
      message: "PDF documentation sent successfully to approver",
      approverEmail: request.approver_email,
    });
  } catch (error) {
    console.error("Error sending PDF to approver:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to send PDF documentation";
    if (error.message.includes("ECONNREFUSED")) {
      errorMessage = "Unable to connect to email server. Please check your network connection and email server settings.";
    } else if (error.message.includes("authentication")) {
      errorMessage = "Email authentication failed. Please check your email credentials.";
    } else if (error.message.includes("Invalid login")) {
      errorMessage = "Invalid email credentials. Please verify your email username and password.";
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
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        error: "Email service not configured",
        message: "Missing email configuration. Please check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.",
      });
    }

    // Import EmailService from the main backend
    const emailServicePath = path.join(
      __dirname,
      "../../../backend/utils/emailService.js"
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
                        Your fund request has been approved and is ready for retirement. Please proceed to collect the approved amount at your earliest convenience.
                      </p>
                      
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
                          <strong>Important:</strong> Please bring this email and a valid ID when retiring the funds. 
                          Contact the finance department if you have any questions.
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
      doc
        .fontSize(12)
        .text(`Export Date: ${new Date().toLocaleString()}`, {
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
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Database Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 Real-time fund request monitoring active`);
});

module.exports = app;
