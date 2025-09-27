const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

class EmailService {
  constructor() {
    // Determine which email service to use based on environment
    this.usesSendGrid =
      process.env.NODE_ENV === "production" && process.env.SENDGRID_API_KEY;

    if (this.usesSendGrid) {
      // Initialize SendGrid for production
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log("��� Using SendGrid for email service (Production)");
    } else {
      // Initialize SMTP for development with enhanced configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === "true",
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
        pool: true, // Use connection pooling
        maxConnections: 1, // Limit connections
        rateDelta: 20000, // Rate limiting
        rateLimit: 5,
        debug: false, // Set to true for debugging
      });
      console.log("��� Using SMTP for email service (Development)");
    }
  }

  async verifyConnection() {
    if (this.usesSendGrid) {
      // SendGrid doesn't have a verify method like nodemailer
      console.log("��� SendGrid email service configured");
      return true;
    } else {
      try {
        await this.transporter.verify();
        console.log("��� SMTP email service connected successfully");
        return true;
      } catch (error) {
        console.error(
          "❌ SMTP email service connection failed:",
          error.message
        );
        return false;
      }
    }
  }

  // Helper method to format currency based on the currency type
  formatCurrency(amount, currency) {
    const number = parseFloat(amount);

    // Currency symbol mapping
    const currencySymbols = {
      NGN: "₦",
      USD: "$",
      EUR: "€",
      CAD: "C$",
    };

    const symbol = currencySymbols[currency] || currency;
    const formattedNumber = number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${symbol}${formattedNumber}`;
  }

  // Helper method to send email with retry logic and better error handling
  async sendEmailWithRetry(emailFunction, maxRetries = 2) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Email attempt ${attempt}/${maxRetries}...`);
        const result = await emailFunction();
        console.log(`✅ Email sent successfully on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        console.log(`❌ Email attempt ${attempt} failed: ${error.message}`);

        // If it's a network/timeout issue, provide helpful context
        if (
          error.code === "ETIMEDOUT" ||
          error.message.includes("Greeting never received")
        ) {
          console.log(`⚠️  Network/SMTP connection issue detected`);
          if (attempt === maxRetries) {
            console.log(`🔧 Consider checking:`);
            console.log(`   - Network firewall settings`);
            console.log(`   - Corporate proxy blocking SMTP`);
            console.log(`   - Gmail SMTP access enabled`);
          }
        }

        if (attempt < maxRetries) {
          const delay = Math.min(2000 * attempt, 5000); // Max 5s delay
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Create a user-friendly error message
    const userFriendlyError = new Error(
      lastError.code === "ETIMEDOUT" ||
      lastError.message.includes("Greeting never received")
        ? "Email service temporarily unavailable due to network connectivity. Request was saved successfully."
        : `Email sending failed: ${lastError.message}`
    );

    userFriendlyError.originalError = lastError;
    userFriendlyError.isNetworkIssue =
      lastError.code === "ETIMEDOUT" ||
      lastError.message.includes("Greeting never received");

    throw userFriendlyError;
  }

  async sendApprovalEmail(requestData, pdfBuffer = null) {
    const approvalUrl = `${process.env.FRONTEND_URL}/approve/${requestData.approval_token}`;

    if (this.usesSendGrid) {
      return this.sendApprovalEmailSendGrid(
        requestData,
        approvalUrl,
        pdfBuffer
      );
    } else {
      return this.sendApprovalEmailSMTP(requestData, approvalUrl, pdfBuffer);
    }
  }

  async sendApprovalEmailSMTP(requestData, approvalUrl, pdfBuffer = null) {
    const emailTemplate = this.createApprovalEmailTemplate(
      requestData,
      approvalUrl
    );

    const mailOptions = {
      from: {
        name: "Fund Request System",
        address: process.env.EMAIL_USER,
      },
      to: requestData.approver_email,
      subject: `Fund Request Approval Required - ${requestData.requester_name}`,
      html: emailTemplate,
      text: this.createPlainTextEmail(requestData, approvalUrl),
    };

    // Add PDF attachment if provided
    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `fund-request-${requestData.id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    }

    // Use retry logic for sending
    return await this.sendEmailWithRetry(async () => {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "✅ Approval email sent successfully via SMTP to:",
        requestData.approver_email
      );
      return result;
    });
  }

  async sendApprovalEmailSendGrid(requestData, approvalUrl, pdfBuffer = null) {
    const emailTemplate = this.createApprovalEmailTemplate(
      requestData,
      approvalUrl
    );

    const msg = {
      to: requestData.approver_email,
      from: {
        name: "Fund Request System",
        email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,
      },
      subject: `Fund Request Approval Required - ${requestData.requester_name}`,
      html: emailTemplate,
      text: this.createPlainTextEmail(requestData, approvalUrl),
    };

    // Add PDF attachment if provided
    if (pdfBuffer) {
      msg.attachments = [
        {
          filename: `fund-request-${requestData.id}.pdf`,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf",
          disposition: "attachment",
        },
      ];
    }

    try {
      const result = await sgMail.send(msg);
      console.log(
        "��� Approval email sent successfully via SendGrid to:",
        requestData.approver_email
      );
      return result;
    } catch (error) {
      console.error(
        "❌ Failed to send approval email via SendGrid:",
        error.message
      );
      throw error;
    }
  }

  async sendConfirmationEmail(requestData, pdfBuffer = null) {
    if (this.usesSendGrid) {
      return this.sendConfirmationEmailSendGrid(requestData, pdfBuffer);
    } else {
      return this.sendConfirmationEmailSMTP(requestData, pdfBuffer);
    }
  }

  async sendConfirmationEmailSMTP(requestData, pdfBuffer = null) {
    const emailTemplate = this.createConfirmationEmailTemplate(requestData);

    const mailOptions = {
      from: {
        name: "Fund Request System",
        address: process.env.EMAIL_USER,
      },
      to: requestData.requester_email,
      subject: `Fund Request Submitted - ${requestData.id}`,
      html: emailTemplate,
      text: this.createPlainTextConfirmationEmail(requestData),
    };

    // Add PDF attachment if provided
    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `fund-request-${requestData.id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    }

    // Use retry logic for sending
    return await this.sendEmailWithRetry(async () => {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "✅ Confirmation email sent successfully via SMTP to:",
        requestData.requester_email
      );
      return result;
    });
  }

  async sendConfirmationEmailSendGrid(requestData, pdfBuffer = null) {
    const emailTemplate = this.createConfirmationEmailTemplate(requestData);

    const msg = {
      to: requestData.requester_email,
      from: {
        name: "Fund Request System",
        email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,
      },
      subject: `Fund Request Submitted - ${requestData.id}`,
      html: emailTemplate,
      text: this.createPlainTextConfirmationEmail(requestData),
    };

    // Add PDF attachment if provided
    if (pdfBuffer) {
      msg.attachments = [
        {
          filename: `fund-request-${requestData.id}.pdf`,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf",
          disposition: "attachment",
        },
      ];
    }

    try {
      const result = await sgMail.send(msg);
      console.log(
        "��� Confirmation email sent successfully via SendGrid to:",
        requestData.requester_email
      );
      return result;
    } catch (error) {
      console.error(
        "❌ Failed to send confirmation email via SendGrid:",
        error.message
      );
      throw error;
    }
  }

  async sendStatusNotification(
    requestData,
    status,
    pdfBuffer = null,
    pdfFilename = null
  ) {
    if (this.usesSendGrid) {
      return this.sendStatusNotificationSendGrid(
        requestData,
        status,
        pdfBuffer,
        pdfFilename
      );
    } else {
      return this.sendStatusNotificationSMTP(
        requestData,
        status,
        pdfBuffer,
        pdfFilename
      );
    }
  }

  async sendStatusNotificationSMTP(
    requestData,
    status,
    pdfBuffer = null,
    pdfFilename = null
  ) {
    const emailTemplate = this.createStatusNotificationTemplate(
      requestData,
      status
    );

    const mailOptions = {
      from: {
        name: "Fund Request System",
        address: process.env.EMAIL_USER,
      },
      to: requestData.requester_email,
      subject: `Fund Request ${
        status.charAt(0).toUpperCase() + status.slice(1)
      } - ${requestData.id}`,
      html: emailTemplate,
      text: this.createPlainTextStatusNotification(requestData, status),
    };

    // Add PDF attachment if provided
    if (pdfBuffer && pdfFilename) {
      mailOptions.attachments = [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    }

    // Use retry logic for sending
    return await this.sendEmailWithRetry(async () => {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ Status notification email sent successfully via SMTP to: ${requestData.requester_email}`
      );
      return result;
    });
  }

  async sendStatusNotificationSendGrid(
    requestData,
    status,
    pdfBuffer = null,
    pdfFilename = null
  ) {
    const emailTemplate = this.createStatusNotificationTemplate(
      requestData,
      status
    );

    const msg = {
      to: requestData.requester_email,
      from: {
        name: "Fund Request System",
        email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,
      },
      subject: `Fund Request ${
        status.charAt(0).toUpperCase() + status.slice(1)
      } - ${requestData.id}`,
      html: emailTemplate,
      text: this.createPlainTextStatusNotification(requestData, status),
    };

    // Add PDF attachment if provided
    if (pdfBuffer && pdfFilename) {
      msg.attachments = [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf",
          disposition: "attachment",
        },
      ];
    }

    try {
      const result = await sgMail.send(msg);
      console.log(
        `✅ Status notification email sent successfully via SendGrid to: ${requestData.requester_email}`
      );
      return result;
    } catch (error) {
      console.error(
        "❌ Failed to send status notification email via SendGrid:",
        error.message
      );
      throw error;
    }
  }

  async sendApprovalDecisionPDF(
    requestData,
    status,
    pdfBuffer,
    pdfFilename,
    approverEmail
  ) {
    if (this.usesSendGrid) {
      return this.sendApprovalDecisionPDFSendGrid(
        requestData,
        status,
        pdfBuffer,
        pdfFilename,
        approverEmail
      );
    } else {
      return this.sendApprovalDecisionPDFSMTP(
        requestData,
        status,
        pdfBuffer,
        pdfFilename,
        approverEmail
      );
    }
  }

  async sendApprovalDecisionPDFSMTP(
    requestData,
    status,
    pdfBuffer,
    pdfFilename,
    approverEmail
  ) {
    const mailOptions = {
      from: {
        name: "Fund Request System",
        address: process.env.EMAIL_USER,
      },
      to: approverEmail,
      subject: `Fund Request ${
        status.charAt(0).toUpperCase() + status.slice(1)
      } - Copy for Records - ${requestData.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Fund Request Decision Record</h2>
          <p>Dear Approver,</p>
          <p>This is a copy of the fund request decision for your records.</p>
          <p><strong>Request ID:</strong> ${requestData.id}</p>
          <p><strong>Requester:</strong> ${requestData.requester_name}</p>
          <p><strong>Amount:</strong> ${this.formatCurrency(
            requestData.amount,
            requestData.currency
          )}</p>
          <p><strong>Status:</strong> ${status.toUpperCase()}</p>
          <p>Please find the complete request details in the attached PDF.</p>
          <br>
          <p>Best regards,<br>Fund Request Management System</p>
        </div>
      `,
      text: `Fund Request Decision Record\\n\\nDear Approver,\\n\\nThis is a copy of the fund request decision for your records.\\n\\nRequest ID: ${
        requestData.id
      }\\nRequester: ${
        requestData.requester_name
      }\\nAmount: ${this.formatCurrency(
        requestData.amount,
        requestData.currency
      )}\\nStatus: ${status.toUpperCase()}\\n\\nPlease find the complete request details in the attached PDF.\\n\\nBest regards,\\nFund Request Management System`,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // Use retry logic for sending
    return await this.sendEmailWithRetry(async () => {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ Approval decision PDF sent successfully via SMTP to: ${approverEmail}`
      );
      return result;
    });
  }

  async sendApprovalDecisionPDFSendGrid(
    requestData,
    status,
    pdfBuffer,
    pdfFilename,
    approverEmail
  ) {
    const msg = {
      to: approverEmail,
      from: {
        name: "Fund Request System",
        email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,
      },
      subject: `Fund Request ${
        status.charAt(0).toUpperCase() + status.slice(1)
      } - Copy for Records - ${requestData.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Fund Request Decision Record</h2>
          <p>Dear Approver,</p>
          <p>This is a copy of the fund request decision for your records.</p>
          <p><strong>Request ID:</strong> ${requestData.id}</p>
          <p><strong>Requester:</strong> ${requestData.requester_name}</p>
          <p><strong>Amount:</strong> ${this.formatCurrency(
            requestData.amount,
            requestData.currency
          )}</p>
          <p><strong>Status:</strong> ${status.toUpperCase()}</p>
          <p>Please find the complete request details in the attached PDF.</p>
          <br>
          <p>Best regards,<br>Fund Request Management System</p>
        </div>
      `,
      text: `Fund Request Decision Record\\n\\nDear Approver,\\n\\nThis is a copy of the fund request decision for your records.\\n\\nRequest ID: ${
        requestData.id
      }\\nRequester: ${
        requestData.requester_name
      }\\nAmount: ${this.formatCurrency(
        requestData.amount,
        requestData.currency
      )}\\nStatus: ${status.toUpperCase()}\\n\\nPlease find the complete request details in the attached PDF.\\n\\nBest regards,\\nFund Request Management System`,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    try {
      const result = await sgMail.send(msg);
      console.log(
        `✅ Approval decision PDF sent successfully via SendGrid to: ${approverEmail}`
      );
      return result;
    } catch (error) {
      console.error(
        "❌ Failed to send approval decision PDF via SendGrid:",
        error.message
      );
      throw error;
    }
  }

  createApprovalEmailTemplate(requestData, approvalUrl) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #007bff; margin: 0; }
    .content { line-height: 1.6; color: #333; }
    .highlight { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
    .approve-btn { display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Fund Request Approval Required</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>A new fund request has been submitted and requires your approval:</p>
      <div class="highlight">
        <h3>Request Summary</h3>
        <table>
          <tr><th>Request ID:</th><td><strong>${
            requestData.id
          }</strong></td></tr>
          <tr><th>Requester:</th><td>${requestData.requester_name}</td></tr>
          <tr><th>Email:</th><td>${requestData.requester_email}</td></tr>
          <tr><th>Department:</th><td>${requestData.department}</td></tr>
          <tr><th>Amount:</th><td><strong>${this.formatCurrency(
            requestData.amount,
            requestData.currency
          )}</strong></td></tr>
          <tr><th>Purpose:</th><td>${requestData.purpose}</td></tr>
          <tr><th>Urgency:</th><td>${
            requestData.urgent ? "Priority" : "Normal"
          }</td></tr>
          <tr><th>Submitted:</th><td>${new Date(
            requestData.created_at
          ).toLocaleDateString()}</td></tr>
        </table>
      </div>
      ${
        requestData.description
          ? `<div style="margin: 20px 0;"><h3>Additional Details:</h3><p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">${requestData.description}</p></div>`
          : ""
      }
      <div style="text-align: center; margin: 30px 0;">
        <h3>Action Required</h3>
        <p>Please review this request and take appropriate action:</p>
        <a href="${approvalUrl}" class="approve-btn">Review & Approve Request</a>
      </div>
    </div>
    <div class="footer">
      <p>This email was sent by the Fund Request Management System</p>
      <p>If you have any questions, please contact IT support</p>
    </div>
  </div>
</body>
</html>`;
  }

  createConfirmationEmailTemplate(requestData) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #28a745; margin: 0; }
    .content { line-height: 1.6; color: #333; }
    .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
    .info-box { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Fund Request Submitted Successfully</h1>
    </div>
    <div class="content">
      <p>Dear ${requestData.requester_name},</p>
      <div class="success-box">
        <h3 style="margin-top: 0;">Request Submitted!</h3>
        <p style="margin-bottom: 0;">Your fund request has been successfully submitted and is now under review.</p>
      </div>
      <div class="info-box">
        <h3>Your Request Details</h3>
        <table>
          <tr><th>Request ID:</th><td><strong>${
            requestData.id
          }</strong></td></tr>
          <tr><th>Amount:</th><td><strong>${this.formatCurrency(
            requestData.amount,
            requestData.currency
          )}</strong></td></tr>
          <tr><th>Purpose:</th><td>${requestData.purpose}</td></tr>
          <tr><th>Department:</th><td>${requestData.department}</td></tr>
          <tr><th>Urgency Level:</th><td>${
            requestData.urgent ? "Priority" : "Normal"
          }</td></tr>
          <tr><th>Submitted Date:</th><td>${new Date(
            requestData.created_at
          ).toLocaleDateString()}</td></tr>
          <tr><th>Status:</th><td><span style="color: #ffc107; font-weight: bold;">Pending Approval</span></td></tr>
        </table>
      </div>
      ${
        requestData.description
          ? `<div style="margin: 20px 0;"><h3>Additional Details Provided:</h3><p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">${requestData.description}</p></div>`
          : ""
      }
    </div>
    <div class="footer">
      <p>This confirmation was sent by the Fund Request Management System</p>
      <p>If you have any questions about your request, please contact your supervisor or IT support</p>
    </div>
  </div>
</body>
</html>`;
  }

  createPlainTextEmail(requestData, approvalUrl) {
    return `Fund Request Approval Required

Request Details:
- Request ID: ${requestData.id}
- Requester: ${requestData.requester_name} (${requestData.requester_email})
- Department: ${requestData.department}
- Amount: ${this.formatCurrency(requestData.amount, requestData.currency)}
- Purpose: ${requestData.purpose}
- Urgency: ${requestData.urgent ? "High Priority" : "Normal"}
- Submitted: ${new Date(requestData.created_at).toLocaleDateString()}

${
  requestData.description
    ? `Additional Details: ${requestData.description}`
    : ""
}

To approve or reject this request, please visit:
${approvalUrl}

This approval link will expire after 7 days.

---
Fund Request Management System`;
  }

  createPlainTextConfirmationEmail(requestData) {
    return `Fund Request Submitted Successfully

Dear ${requestData.requester_name},

Your fund request has been successfully submitted and is now under review.

Request Details:
- Request ID: ${requestData.id}
- Amount: ${this.formatCurrency(requestData.amount, requestData.currency)}
- Purpose: ${requestData.purpose}
- Department: ${requestData.department}
- Urgency Level: ${requestData.urgent ? "Priority" : "Normal"}
- Submitted Date: ${new Date(requestData.created_at).toLocaleDateString()}
- Status: Pending Approval

${
  requestData.description
    ? `Additional Details: ${requestData.description}`
    : ""
}

What Happens Next:
1. Your request has been sent to the appropriate approver
2. Most requests are reviewed within 2-3 business days
3. You'll receive an email once a decision is made
4. The approver may contact you for additional information

Please keep this email and your Request ID (${requestData.id}) for your records.

---
Fund Request Management System`;
  }

  createStatusNotificationTemplate(requestData, status) {
    const isApproved = status.toLowerCase() === "approved";
    const statusColor = isApproved ? "#28a745" : "#dc3545";
    const statusIcon = isApproved ? "✅" : "❌";
    const statusText = isApproved ? "APPROVED" : "REJECTED";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid ${statusColor}; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: ${statusColor}; margin: 0; }
    .content { line-height: 1.6; color: #333; }
    .status-box { background-color: ${
      isApproved ? "#d4edda" : "#f8d7da"
    }; border: 1px solid ${isApproved ? "#c3e6cb" : "#f5c6cb"}; color: ${
      isApproved ? "#155724" : "#721c24"
    }; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
    .info-box { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusIcon} Fund Request ${statusText}</h1>
    </div>
    <div class="content">
      <p>Dear ${requestData.requester_name},</p>
      <div class="status-box">
        <h3 style="margin-top: 0;">Your fund request has been ${statusText.toLowerCase()}</h3>
        <p style="margin-bottom: 0;">${
          isApproved
            ? "Your request has been approved and is now being processed."
            : "Unfortunately, your request could not be approved at this time."
        }</p>
      </div>
      <div class="info-box">
        <h3>Request Details</h3>
        <table>
          <tr><th>Request ID:</th><td><strong>${
            requestData.id
          }</strong></td></tr>
          <tr><th>Amount:</th><td><strong>${this.formatCurrency(
            requestData.amount,
            requestData.currency
          )}</strong></td></tr>
          <tr><th>Purpose:</th><td>${requestData.purpose}</td></tr>
          <tr><th>Department:</th><td>${requestData.department}</td></tr>
          <tr><th>Decision Date:</th><td>${new Date().toLocaleDateString()}</td></tr>
          <tr><th>Status:</th><td><span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></td></tr>
        </table>
      </div>
      ${
        requestData.decision_comments
          ? `<div style="margin: 20px 0;">
          <h3>Decision Comments:</h3>
          <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid ${statusColor};">
            ${requestData.decision_comments}
          </p>
        </div>`
          : ""
      }
      ${
        isApproved
          ? `<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Next Steps:</h4>
          <ul style="margin-bottom: 0;">
            <li>Your funds will be processed according to company policy</li>
            <li>You will receive further communication regarding disbursement</li>
            <li>Keep this email and the attached PDF for your records</li>
          </ul>
        </div>`
          : `<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0;">What Now:</h4>
          <ul style="margin-bottom: 0;">
            <li>You may resubmit your request with additional information if needed</li>
            <li>Contact your supervisor or finance department for more details</li>
            <li>Keep this email for your records</li>
          </ul>
        </div>`
      }
    </div>
    <div class="footer">
      <p>This notification was sent by the Fund Request Management System</p>
      <p>If you have any questions, please contact your supervisor or IT support</p>
    </div>
  </div>
</body>
</html>`;
  }

  createPlainTextStatusNotification(requestData, status) {
    const isApproved = status.toLowerCase() === "approved";
    const statusText = isApproved ? "APPROVED" : "REJECTED";

    return `Fund Request ${statusText}

Dear ${requestData.requester_name},

Your fund request has been ${statusText.toLowerCase()}.

Request Details:
- Request ID: ${requestData.id}
- Amount: ${this.formatCurrency(requestData.amount, requestData.currency)}
- Purpose: ${requestData.purpose}
- Department: ${requestData.department}
- Decision Date: ${new Date().toLocaleDateString()}
- Status: ${statusText}

${
  requestData.decision_comments
    ? `Decision Comments: ${requestData.decision_comments}`
    : ""
}

${
  isApproved
    ? `Next Steps:
- Your funds will be processed according to company policy
- You will receive further communication regarding disbursement
- Keep this email and any attachments for your records`
    : `What Now:
- You may resubmit your request with additional information if needed
- Contact your supervisor or finance department for more details
- Keep this email for your records`
}

---
Fund Request Management System`;
  }
}

module.exports = EmailService;
