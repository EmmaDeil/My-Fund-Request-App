const express = require("express");
const db = require("../models/mongoDatabase");
const emailService = require("../utils/emailService"); // Import singleton instance
const pdfGenerator = require("../utils/pdfGenerator");

const router = express.Router();

// Get fund request details by approval token
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 10) {
      return res.status(400).json({
        error: "Invalid approval token format",
      });
    }

    const request = await db.getFundRequestByToken(token);

    if (!request) {
      return res.status(404).json({
        error: "Invalid or expired approval token",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        error: "This request has already been processed",
        status: request.status,
      });
    }

    // Check if token is expired (7 days)
    const createdAt = new Date(request.created_at);
    const now = new Date();
    const daysDiff = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (daysDiff > 7) {
      return res.status(400).json({
        error: "This approval token has expired",
        expiredDays: Math.floor(daysDiff),
      });
    }

    // Remove sensitive data but keep approval token for this endpoint
    const { ...requestData } = request;

    res.json({
      request: requestData,
      daysRemaining: Math.max(0, 7 - Math.floor(daysDiff)),
    });
  } catch (error) {
    console.error("Error fetching request by token:", error);
    res.status(500).json({
      error: "Failed to fetch request details",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Approve or deny a fund request
router.post("/:token/:action", async (req, res) => {
  try {
    const { token, action } = req.params;
    const { approver_name, notes } = req.body;

    // Validate action
    if (!["approve", "deny"].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be "approve" or "deny"',
      });
    }

    // Validate token
    if (!token || token.length < 10) {
      return res.status(400).json({
        error: "Invalid approval token format",
      });
    }

    // Validate approver name
    if (!approver_name || approver_name.trim().length < 2) {
      return res.status(400).json({
        error: "Approver name is required and must be at least 2 characters",
      });
    }

    const request = await db.getFundRequestByToken(token);

    if (!request) {
      return res.status(404).json({
        error: "Invalid or expired approval token",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        error: "This request has already been processed",
        currentStatus: request.status,
      });
    }

    // Check if token is expired (7 days)
    const createdAt = new Date(request.created_at);
    const now = new Date();
    const daysDiff = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (daysDiff > 7) {
      return res.status(400).json({
        error: "This approval token has expired",
        expiredDays: Math.floor(daysDiff),
      });
    }

    // Update request status
    const newStatus = action === "approve" ? "approved" : "denied";
    await db.updateFundRequestStatus(
      request.id,
      newStatus,
      approver_name.trim(),
      notes?.trim() || null
    );

    // Get updated request for email
    const updatedRequest = await db.getFundRequestById(request.id);

    // Generate PDF of the approval decision
    let pdfBuffer = null;
    let pdfFilename = null;

    try {
      const requestIdShort = updatedRequest._id
        .toString()
        .slice(-6)
        .toUpperCase();
      pdfFilename = `fund-request-${newStatus}-${requestIdShort}.pdf`;
      pdfBuffer = await pdfGenerator.generateApprovalPDF(
        updatedRequest,
        newStatus,
        approver_name.trim(),
        notes?.trim() || null
      );
    } catch (pdfError) {
      console.error("Failed to generate PDF:", pdfError);
      // Continue without PDF if generation fails
    }

    // Send status notification email to requester (with PDF attachment)
    try {
      await emailService.sendStatusNotification(
        updatedRequest,
        newStatus,
        pdfBuffer,
        pdfFilename
      );
    } catch (emailError) {
      console.error("Failed to send status notification email:", emailError);
      // Don't fail the approval process if email fails
    }

    // Send PDF copy to approver as confirmation (if we have approver email)
    if (pdfBuffer) {
      // For now, we'll need to add approver email to the request body or system
      // This is a placeholder for future enhancement where approvers can be stored in system
      const approverEmail = req.body.approver_email; // Optional field

      if (approverEmail && approverEmail.includes("@")) {
        try {
          await emailService.sendApprovalDecisionPDF(
            updatedRequest,
            newStatus,
            pdfBuffer,
            pdfFilename,
            approverEmail
          );
        } catch (approverEmailError) {
          console.error(
            "Failed to send PDF confirmation to approver:",
            approverEmailError
          );
          // Don't fail the approval process if approver email fails
        }
      }
    }

    const response = {
      message: `Fund request ${action}d successfully`,
      requestId: request.id,
      status: newStatus,
      approvedBy: approver_name.trim(),
      processedAt: new Date().toISOString(),
    };

    if (notes) {
      response.notes = notes.trim();
    }

    res.json(response);
  } catch (error) {
    console.error("Error processing approval:", error);
    res.status(500).json({
      error: "Failed to process approval",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Get approval status (for checking if already processed)
router.get("/:token/status", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 10) {
      return res.status(400).json({
        error: "Invalid approval token format",
      });
    }

    const request = await db.getFundRequestByToken(token);

    if (!request) {
      return res.status(404).json({
        error: "Invalid approval token",
      });
    }

    // Check if token is expired (7 days)
    const createdAt = new Date(request.created_at);
    const now = new Date();
    const daysDiff = (now - createdAt) / (1000 * 60 * 60 * 24);

    const response = {
      requestId: request.id,
      status: request.status,
      createdAt: request.created_at,
      isExpired: daysDiff > 7,
      daysRemaining: Math.max(0, 7 - Math.floor(daysDiff)),
    };

    if (request.status !== "pending") {
      response.approvedBy = request.approved_by;
      response.approvedAt = request.approved_at;
      response.notes = request.approval_notes;
    }

    res.json(response);
  } catch (error) {
    console.error("Error checking approval status:", error);
    res.status(500).json({
      error: "Failed to check approval status",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
