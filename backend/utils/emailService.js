const nodemailer = require("nodemailer");
const {
  createBeautifulApprovalRequestTemplate,
  createBeautifulApprovalTemplate,
  createBeautifulDenialTemplate,
} = require("./beautifulEmailTemplates");
// Note: Environment variables are loaded in server.js - do not reload here to avoid overriding production config

class EmailService {
  constructor() {
    // Initialize SMTP with Gmail-optimized configuration for serverless
    this.transporter = nodemailer.createTransport({
      service: "gmail", // Use Gmail service for better compatibility
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 60000, // 60 seconds for serverless
      greetingTimeout: 30000,
      socketTimeout: 60000,
      tls: {
        rejectUnauthorized: false,
      },
      pool: false, // No connection pooling for serverless
      debug: process.env.NODE_ENV === "development",
    });
    console.log("📧 Using Gmail SMTP service");
    console.log(
      `📧 SMTP Config: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT} (secure: ${process.env.EMAIL_SECURE})`
    );
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP email service verified successfully");
      return true;
    } catch (error) {
      console.error(
        "❌ SMTP email service verification failed:",
        error.message
      );
      return false;
    }
  }

  // Helper method to format currency based on type
  formatCurrency(amount, currency = "NGN") {
    const currencySymbols = {
      NGN: "₦",
      USD: "$",
      EUR: "€",
      CAD: "C$",
    };

    const symbol = currencySymbols[currency] || currency;
    const numericAmount = parseFloat(amount) || 0;
    return `${symbol}${numericAmount.toLocaleString()}`;
  }

  // Enhanced email sending with retry logic
  async sendEmailWithRetry(mailOptions, maxRetries = 3, requestId = "Unknown") {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📧 [Request ID: ${requestId}] Sending email (attempt ${attempt}/${maxRetries}) to: ${mailOptions.to}`
        );
        const result = await this.transporter.sendMail(mailOptions);
        console.log(
          `✅ [Request ID: ${requestId}] Email sent successfully! Message ID: ${result.messageId}`
        );
        return result;
      } catch (error) {
        console.error(
          `❌ [Request ID: ${requestId}] Email sending failed (attempt ${attempt}/${maxRetries}):`,
          error.message
        );

        if (attempt === maxRetries) {
          // Final attempt failed - throw error to properly indicate failure
          console.error(
            `❌ [Request ID: ${requestId}] All email attempts failed. Email could not be delivered.`
          );
          throw new Error(
            `Email delivery failed after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`⏳ Waiting ${delay / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async sendFundRequestNotification(fundRequest, approvers) {
    console.log(
      `📋 [Request ID: ${fundRequest.id}] Preparing approval request notification`
    );
    const approverEmails = approvers.map((approver) => approver.email);
    console.log(
      `📧 [Request ID: ${
        fundRequest.id
      }] Sending to approvers: ${approverEmails.join(", ")}`
    );
    const formattedAmount = this.formatCurrency(
      fundRequest.amount,
      fundRequest.currency
    );

    const urgencyColor =
      fundRequest.urgency === "High" || fundRequest.urgent
        ? "#e74c3c"
        : "#28a745";
    const urgencyIcon =
      fundRequest.urgency === "High" || fundRequest.urgent ? "🚨" : "📋";
    const priorityBadge =
      fundRequest.urgency === "High" || fundRequest.urgent
        ? "HIGH PRIORITY"
        : "NORMAL";

    const baseUrl = (
      process.env.FRONTEND_URL || "https://my-fund-request-app.onrender.com"
    ).replace(/\/$/, "");
    const approvalUrl = `${baseUrl}/approve?token=${fundRequest.approval_token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: approverEmails,
      subject: `${urgencyIcon} New Fund Request: ${fundRequest.purpose} - ${formattedAmount}`,
      html: createBeautifulApprovalRequestTemplate(
        fundRequest,
        approvers,
        urgencyColor,
        priorityBadge,
        approvalUrl
      ),
    };

    return await this.sendEmailWithRetry(mailOptions, 3, fundRequest.id);
  }

  async sendStatusNotification(fundRequest, status, approver, comments = "") {
    console.log(
      `📋 [Request ID: ${fundRequest.id}] Preparing ${status} notification to requester`
    );
    console.log(
      `📧 [Request ID: ${fundRequest.id}] Status notification to: ${fundRequest.requester_email} (${status} by ${approver})`
    );
    const formattedAmount = this.formatCurrency(
      fundRequest.amount,
      fundRequest.currency
    );

    const statusEmoji = status === "approved" ? "✅" : "❌";
    const statusText = status === "approved" ? "APPROVED" : "DENIED";

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: fundRequest.requester_email,
      subject: `${statusEmoji} Fund Request ${statusText}: ${fundRequest.purpose} - ${formattedAmount}`,
      html:
        status === "approved"
          ? createBeautifulApprovalTemplate(fundRequest, approver, comments)
          : createBeautifulDenialTemplate(fundRequest, approver, comments),
    };

    return await this.sendEmailWithRetry(mailOptions, 3, fundRequest.id);
  }

  async sendApprovalDecisionPDF(fundRequest, status, approver, pdfBuffer) {
    console.log(
      `📋 [Request ID: ${fundRequest.id}] Preparing ${status} PDF notification`
    );
    console.log(
      `📧 [Request ID: ${fundRequest.id}] PDF email to: ${fundRequest.requester_email}`
    );
    const formattedAmount = this.formatCurrency(
      fundRequest.amount,
      fundRequest.currency
    );
    const statusColor = status === "approved" ? "#28a745" : "#dc3545";
    const statusEmoji = status === "approved" ? "✅" : "❌";
    const documentIcon = "📄";
    const statusText = status.toUpperCase();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: fundRequest.requester_email,
      subject: `${documentIcon} Official Document: Fund Request ${statusText} - ${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Official Fund Request Document</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', sans-serif;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
            <div style="background: ${statusColor}; padding: 30px; text-align: center; color: white;">
              <div style="font-size: 40px; margin-bottom: 10px;">${documentIcon}</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Official Decision Document</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">Fund Request ${statusText}</p>
            </div>
            <div style="padding: 30px; text-align: center;">
              <p style="color: #64748b; margin: 0; font-size: 16px; line-height: 1.6;">
                Your official fund request decision document is attached to this email as a PDF file.
                Please save this document for your records.
              </p>
              <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">Document Details</h3>
                <p style="color: #64748b; margin: 0; font-size: 14px;">
                  Request: ${fundRequest.purpose}<br>
                  Amount: ${formattedAmount}<br>
                  Status: ${statusEmoji} ${statusText}
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `fund-request-${status}-${
            fundRequest.id || "document"
          }.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    return await this.sendEmailWithRetry(mailOptions, 3, fundRequest.id);
  }

  async sendApprovalEmail(requestData) {
    console.log(
      `📋 [Request ID: ${requestData.id}] Preparing approval email to approver`
    );
    console.log(
      `📧 [Request ID: ${requestData.id}] Approval email to: ${requestData.approver_email}`
    );
    const baseUrl = (
      process.env.FRONTEND_URL || "https://my-fund-request-app.onrender.com"
    ).replace(/\/$/, "");
    const approvalUrl = `${baseUrl}/approve?token=${requestData.approval_token}`;
    const formattedAmount = this.formatCurrency(
      requestData.amount,
      requestData.currency
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: requestData.approver_email,
      subject: `📋 New Fund Request Approval Required - ${formattedAmount}`,
      html: createBeautifulApprovalRequestTemplate(
        requestData,
        [{ email: requestData.approver_email }],
        requestData.urgent ? "#e74c3c" : "#28a745",
        requestData.urgent ? "HIGH PRIORITY" : "NORMAL",
        approvalUrl
      ),
    };

    return await this.sendEmailWithRetry(mailOptions, 3, requestData.id);
  }

  async sendConfirmationEmail(requestData) {
    console.log(
      `📋 [Request ID: ${requestData.id}] Preparing confirmation email to requester`
    );
    console.log(
      `📧 [Request ID: ${requestData.id}] Confirmation email to: ${requestData.requester_email}`
    );
    const formattedAmount = this.formatCurrency(
      requestData.amount,
      requestData.currency
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: requestData.requester_email,
      subject: `✅ Fund Request Submitted Successfully - ${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fund Request Submitted Successfully</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #0d131aff; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #dee6eeff; font-family: 'Inter', sans-serif;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white;">
              <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
                Fund Request Submitted Successfully
              </h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9; font-weight: 400;">
                Your request has been received and is under review
              </p>
            </div>
            
            <!-- Status Badge -->
            <div style="text-align: center; margin-top: -20px; position: relative; z-index: 10;">
              <span style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 32px; border-radius: 25px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(22, 163, 74, 0.3);">
                PENDING APPROVAL
              </span>
            </div>
            
            <!-- Content -->
            <div style="padding: 35px 30px;">
              
              <!-- Request Summary -->
              <div style="background-color: #f0f9ff; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #bae6fd;">
                <h2 style="color: #0369a1; margin: 0 0 24px 0; font-size: 20px; font-weight: 600;">Your Request Summary</h2>
                
                <div style="space-y: 16px;">
                  <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-weight: 500; font-size: 14px;">Request ID:</span>
                    <span style="color: #0c4a6e; font-weight: 600; font-family: 'SF Mono', monospace; font-size: 14px;">${
                      requestData.id
                    }</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-weight: 500; font-size: 14px;">Amount:</span>
                    <span style="color: #059669; font-weight: 700; font-size: 20px;">${formattedAmount}</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-weight: 500; font-size: 14px;">Purpose:</span>
                    <span style="color: #0c4a6e; font-weight: 500; font-size: 14px; text-align: right; max-width: 300px;">${
                      requestData.purpose
                    }</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-weight: 500; font-size: 14px;">Department:</span>
                    <span style="color: #7c3aed; font-weight: 500; font-size: 14px;">${
                      requestData.department || "Not specified"
                    }</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-weight: 500; font-size: 14px;">Category:</span>
                    <span style="color: #dc2626; font-weight: 500; font-size: 14px;">${
                      requestData.category
                    }</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-weight: 500; font-size: 14px;">Submitted:</span>
                    <span style="color: #0c4a6e; font-weight: 500; font-size: 14px;">${new Date(
                      requestData.created_at || requestData.createdAt
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 14px 0;">
                    <span style="color: #0369a1; font-weight: 500; font-size: 14px;">Approver:</span>
                    <span style="color: #0c4a6e; font-weight: 500; font-size: 14px;">${
                      requestData.approverEmail
                    }</span>
                  </div>
                </div>
              </div>
              
              <!-- Next Steps -->
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 16px; padding: 28px; text-align: center; border: 1px solid #3b82f6;">
                <div style="font-size: 32px; margin-bottom: 16px;">ℹ️</div>
                <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
                  What happens next?
                </h3>
                <ul style="color: #1e40af; margin: 0; padding-left: 20px; text-align: left; font-size: 14px; line-height: 1.6;">
                  <li>Your approver will receive an email notification</li>
                  <li>They will review your request and make a decision</li>
                  <li>You'll receive an email update once the decision is made</li>
                </ul>
                <p style="color: #1e40af; margin: 15px 0 0 0; font-size: 13px; line-height: 1.5;">
                  Keep this email for your records, you can reference your request using ID: <strong>${
                    requestData.id
                  }</strong>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">
                This is an automated confirmation email from the Fund Request System
              </p>
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                If you have any questions about your request, please contact your approver or system administrator.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return await this.sendEmailWithRetry(mailOptions, 3, requestData.id);
  }

  async sendRetirementNotification(fundRequest, retirementUrl) {
    const formattedAmount = this.formatCurrency(
      fundRequest.amount,
      fundRequest.currency
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: fundRequest.requester_email,
      subject: `📄 Fund Retirement Required: ${fundRequest.purpose} - ${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fund Retirement Required</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', sans-serif;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
            
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; color: white;">
              <div style="font-size: 48px; margin-bottom: 12px;">📄</div>
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
                Fund Retirement Required
              </h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9; font-weight: 400;">
                Please submit your fund retirement documentation
              </p>
            </div>
            
            <div style="padding: 35px 30px;">
              <div style="background-color: #fef3c7; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #fbbf24;">
                <h2 style="color: #92400e; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">Retirement Details</h2>
                <p style="color: #92400e; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                  Your approved fund request requires retirement documentation. Please upload the necessary documents to complete this process.
                </p>
                
                <div style="margin: 25px 0;">
                  <a href="${retirementUrl}" 
                     style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.3); transition: all 0.3s ease;">
                    Submit Retirement Documents
                  </a>
                </div>
                
                <p style="color: #92400e; margin: 20px 0 0 0; font-size: 13px; line-height: 1.6;">
                  If you cannot click the button above, copy and paste this URL into your browser:<br>
                  <span style="font-family: 'SF Mono', monospace; background-color: #ffffff; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db; font-size: 12px; word-break: break-all; display: inline-block; margin-top: 8px;">${retirementUrl}</span>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return await this.sendEmailWithRetry(mailOptions, 3, fundRequest.id);
  }
}

// Create and export singleton instance
module.exports = new EmailService();
