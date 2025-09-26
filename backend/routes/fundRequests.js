const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../models/mongoDatabase");
const emailService = require("../utils/emailService");

const router = express.Router();

// Create a new fund request
router.post("/", async (req, res) => {
  try {
    console.log("🚀 POST /fund-requests - Request received");
    console.log(
      `📝 New fund request received from: ${req.body.requester_email}`
    );
    console.log(`💰 Amount: ${req.body.amount} ${req.body.currency || "USD"}`);

    const {
      requester_name,
      requester_email,
      amount,
      currency,
      purpose,
      description,
      approver_email,
      department,
      category,
      urgent,
    } = req.body;

    console.log("✅ Request data extracted successfully");

    // Validation
    if (
      !requester_name ||
      !requester_email ||
      !amount ||
      !purpose ||
      !approver_email
    ) {
      console.log("❌ Validation failed - missing required fields");
      return res.status(400).json({
        error: "Missing required fields",
        required: [
          "requester_name",
          "requester_email",
          "amount",
          "purpose",
          "approver_email",
        ],
      });
    }

    console.log("✅ Validation passed");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requester_email) || !emailRegex.test(approver_email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        error: "Amount must be a positive number",
      });
    }

    if (numAmount > 1000000) {
      return res.status(400).json({
        error: "Amount cannot exceed $1,000,000",
      });
    }

    const requestId = uuidv4();
    const approvalToken = uuidv4();

    const requestData = {
      id: requestId,
      requester_name: requester_name.trim(),
      requester_email: requester_email.trim().toLowerCase(),
      amount: numAmount,
      currency: currency || "USD",
      purpose: purpose.trim(),
      description: description?.trim() || null,
      approver_email: approver_email.trim().toLowerCase(),
      approval_token: approvalToken,
      department: department?.trim() || null,
      category: category?.trim() || null,
      urgent: Boolean(urgent),
    };

    // Save to database first
    console.log("💾 Attempting to save to database...");
    await db.createFundRequest(requestData);
    console.log("✅ Successfully saved to database");

    // Send emails with timeout to prevent hanging
    console.log("📧 Starting email sending process...");
    const sendEmailsWithTimeout = async () => {
      const EMAIL_TIMEOUT = 15000; // 15 seconds timeout

      const sendEmailWithTimeout = (emailPromise, timeoutMs) => {
        return Promise.race([
          emailPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Email timeout")), timeoutMs)
          ),
        ]);
      };

      const emailPromises = [
        sendEmailWithTimeout(
          emailService.sendApprovalEmail(requestData),
          EMAIL_TIMEOUT
        )
          .then(() => ({ type: "approval", success: true }))
          .catch((error) => ({
            type: "approval",
            success: false,
            error: error.message,
          })),

        sendEmailWithTimeout(
          emailService.sendConfirmationEmail(requestData),
          EMAIL_TIMEOUT
        )
          .then(() => ({ type: "confirmation", success: true }))
          .catch((error) => ({
            type: "confirmation",
            success: false,
            error: error.message,
          })),
      ];

      return Promise.allSettled(emailPromises);
    };

    // Send emails but don't wait too long
    let approvalEmailSent = false;
    let confirmationEmailSent = false;
    let emailErrors = [];

    try {
      const emailResults = await sendEmailsWithTimeout();

      emailResults.forEach((result) => {
        if (result.status === "fulfilled") {
          const { type, success, error } = result.value;
          if (type === "approval") {
            approvalEmailSent = success;
            if (!success) emailErrors.push(`Approval email failed: ${error}`);
            else
              console.log(
                `✅ Approval email sent to: ${requestData.approver_email}`
              );
          } else if (type === "confirmation") {
            confirmationEmailSent = success;
            if (!success)
              emailErrors.push(`Confirmation email failed: ${error}`);
            else
              console.log(
                `✅ Confirmation email sent to: ${requestData.requester_email}`
              );
          }
        }
      });
    } catch (error) {
      console.error("Email sending failed:", error);
      emailErrors.push(`Email system error: ${error.message}`);
    }

    // Determine response based on email success
    if (!approvalEmailSent && !confirmationEmailSent) {
      return res.status(201).json({
        message:
          "Fund request created successfully, but both email notifications failed",
        requestId,
        approvalEmailSent: false,
        confirmationEmailSent: false,
        warning:
          "Both approval and confirmation emails could not be sent. Please contact the approver manually and check your email configuration.",
        errors: emailErrors,
      });
    } else if (!approvalEmailSent) {
      return res.status(201).json({
        message: "Fund request created successfully, but approval email failed",
        requestId,
        approvalEmailSent: false,
        confirmationEmailSent: true,
        warning:
          "Approval email could not be sent. Please contact the approver manually.",
        errors: emailErrors,
      });
    } else if (!confirmationEmailSent) {
      return res.status(201).json({
        message:
          "Fund request created successfully, but confirmation email failed",
        requestId,
        approvalEmailSent: true,
        confirmationEmailSent: false,
        warning: "Confirmation email could not be sent to requester.",
        errors: emailErrors,
      });
    }

    res.status(201).json({
      message: "Fund request submitted successfully",
      requestId,
      approvalEmailSent: true,
      confirmationEmailSent: true,
    });
  } catch (error) {
    console.error("Error creating fund request:", error);
    res.status(500).json({
      error: "Failed to create fund request",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Get a fund request by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length < 10) {
      return res.status(400).json({
        error: "Invalid request ID format",
      });
    }

    const request = await db.getFundRequestById(id);

    if (!request) {
      return res.status(404).json({
        error: "Fund request not found",
      });
    }

    // Remove sensitive data
    const { approval_token, ...safeRequest } = request;

    res.json({
      request: safeRequest,
    });
  } catch (error) {
    console.error("Error fetching fund request:", error);
    res.status(500).json({
      error: "Failed to fetch fund request",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Get all fund requests (for admin/dashboard purposes)
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const status = req.query.status;

    let requests = await db.getAllFundRequests(limit, offset);

    // Filter by status if provided
    if (status && ["pending", "approved", "denied"].includes(status)) {
      requests = requests.filter((req) => req.status === status);
    }

    // Remove sensitive data
    const safeRequests = requests.map((request) => {
      const { approval_token, ...safeRequest } = request;
      return safeRequest;
    });

    res.json({
      requests: safeRequests,
      pagination: {
        limit,
        offset,
        total: safeRequests.length,
      },
    });
  } catch (error) {
    console.error("Error fetching fund requests:", error);
    res.status(500).json({
      error: "Failed to fetch fund requests",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Resend approval email
router.post("/:id/resend-approval", async (req, res) => {
  try {
    const { id } = req.params;

    const request = await db.getFundRequestById(id);

    if (!request) {
      return res.status(404).json({
        error: "Fund request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        error: "Cannot resend approval email for non-pending requests",
      });
    }

    await emailService.sendApprovalEmail(request);

    res.json({
      message: "Approval email resent successfully",
    });
  } catch (error) {
    console.error("Error resending approval email:", error);
    res.status(500).json({
      error: "Failed to resend approval email",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
