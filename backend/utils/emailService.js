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
      // Initialize SMTP for development
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "��� Approval email sent successfully via SMTP to:",
        requestData.approver_email
      );
      return result;
    } catch (error) {
      console.error(
        "❌ Failed to send approval email via SMTP:",
        error.message
      );
      throw error;
    }
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "��� Confirmation email sent successfully via SMTP to:",
        requestData.requester_email
      );
      return result;
    } catch (error) {
      console.error(
        "❌ Failed to send confirmation email via SMTP:",
        error.message
      );
      throw error;
    }
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
      <h1>��� Fund Request Approval Required</h1>
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
          <tr><th>Amount:</th><td><strong>$${parseFloat(
            requestData.amount
          ).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}</strong></td></tr>
          <tr><th>Purpose:</th><td>${requestData.purpose}</td></tr>
          <tr><th>Urgency:</th><td>${requestData.urgency}</td></tr>
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
        <a href="${approvalUrl}" class="approve-btn">��� Review & Approve Request</a>
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
        <h3 style="margin-top: 0;">��� Request Submitted!</h3>
        <p style="margin-bottom: 0;">Your fund request has been successfully submitted and is now under review.</p>
      </div>
      <div class="info-box">
        <h3>Your Request Details</h3>
        <table>
          <tr><th>Request ID:</th><td><strong>${
            requestData.id
          }</strong></td></tr>
          <tr><th>Amount:</th><td><strong>$${parseFloat(
            requestData.amount
          ).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}</strong></td></tr>
          <tr><th>Purpose:</th><td>${requestData.purpose}</td></tr>
          <tr><th>Department:</th><td>${requestData.department}</td></tr>
          <tr><th>Urgency Level:</th><td>${requestData.urgency}</td></tr>
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
- Amount: $${parseFloat(requestData.amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}
- Purpose: ${requestData.purpose}
- Urgency: ${requestData.urgency}
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
- Amount: $${parseFloat(requestData.amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}
- Purpose: ${requestData.purpose}
- Department: ${requestData.department}
- Urgency Level: ${requestData.urgency}
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
}

module.exports = EmailService;
