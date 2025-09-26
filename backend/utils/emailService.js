const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("📧 Email service connected successfully");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error.message);
      return false;
    }
  }

  async sendApprovalEmail(requestData) {
    const approvalUrl = `${process.env.FRONTEND_URL}/approve/${requestData.approval_token}`;

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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "📧 Approval email sent successfully to:",
        requestData.approver_email
      );
      return result;
    } catch (error) {
      console.error("❌ Failed to send approval email:", error.message);
      throw error;
    }
  }

  async sendConfirmationEmail(requestData) {
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "📧 Confirmation email sent successfully to:",
        requestData.requester_email
      );
      return result;
    } catch (error) {
      console.error("❌ Failed to send confirmation email:", error.message);
      throw error;
    }
  }

  async sendStatusNotification(
    requestData,
    status,
    pdfBuffer = null,
    pdfFilename = null
  ) {
    const subject =
      status === "approved"
        ? `Fund Request Approved - ${requestData.id}`
        : `Fund Request Denied - ${requestData.id}`;

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
      subject: subject,
      html: emailTemplate,
      text: this.createPlainTextStatusEmail(requestData, status),
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
      console.log(`📎 PDF attachment added: ${pdfFilename}`);
    }

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        `📧 Status notification sent to requester: ${requestData.requester_email}`
      );
      return result;
    } catch (error) {
      console.error("❌ Failed to send status notification:", error.message);
      throw error;
    }
  }

  async sendApprovalDecisionPDF(
    requestData,
    decision,
    pdfBuffer,
    pdfFilename,
    approverEmail
  ) {
    try {
      if (!pdfBuffer || !approverEmail) {
        throw new Error("PDF buffer and approver email are required");
      }

      const subject = `Fund Request Decision Confirmation - ${
        decision === "approved" ? "Approved" : "Denied"
      } (#${requestData._id.toString().slice(-6).toUpperCase()})`;

      const htmlContent = this.createApprovalDecisionPDFTemplate(
        requestData,
        decision
      );
      const textContent = this.createPlainTextApprovalDecisionPDF(
        requestData,
        decision
      );

      const mailOptions = {
        from: {
          name: "Fund Request System",
          address: process.env.EMAIL_USER,
        },
        to: approverEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        `📧 PDF decision confirmation sent to approver ${approverEmail}:`,
        info.messageId
      );
      return info;
    } catch (error) {
      console.error("❌ Error sending approval decision PDF:", error);
      throw error;
    }
  }

  createApprovalEmailTemplate(requestData, approvalUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fund Request Approval</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .request-details { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .amount { font-size: 1.5em; color: #4CAF50; font-weight: bold; }
            .btn { display: inline-block; padding: 15px 30px; margin: 10px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; transition: all 0.3s; }
            .btn-approve { background-color: #4CAF50; color: white; }
            .btn-approve:hover { background-color: #45a049; }
            .btn-deny { background-color: #f44336; color: white; }
            .btn-deny:hover { background-color: #da190b; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
            .urgent { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Fund Request Approval Required</h1>
                <p>A new fund request is awaiting your approval</p>
            </div>
            <div class="content">
                ${
                  requestData.urgent
                    ? '<div class="urgent"><strong>⚠️ URGENT REQUEST</strong></div>'
                    : ""
                }
                
                <div class="request-details">
                    <h2>Request Details</h2>
                    <div class="detail-row">
                        <span class="detail-label">Request ID:</span>
                        <span class="detail-value">${requestData.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Requested by:</span>
                        <span class="detail-value">${
                          requestData.requester_name
                        } (${requestData.requester_email})</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value amount">${
                          requestData.currency
                        } ${parseFloat(
      requestData.amount
    ).toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Purpose:</span>
                        <span class="detail-value">${requestData.purpose}</span>
                    </div>
                    ${
                      requestData.description
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${requestData.description}</span>
                    </div>
                    `
                        : ""
                    }
                    ${
                      requestData.department
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Department:</span>
                        <span class="detail-value">${requestData.department}</span>
                    </div>
                    `
                        : ""
                    }
                    ${
                      requestData.category
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${requestData.category}</span>
                    </div>
                    `
                        : ""
                    }
                    <div class="detail-row">
                        <span class="detail-label">Submitted:</span>
                        <span class="detail-value">${new Date(
                          requestData.created_at
                        ).toLocaleString()}</span>
                    </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p><strong>Please review and approve or deny this fund request:</strong></p>
                    <a href="${approvalUrl}" class="btn btn-approve">Review Request</a>
                </div>

                <div class="footer">
                    <p>This link will expire in 7 days. If you cannot click the button above, copy and paste this URL into your browser:</p>
                    <p><a href="${approvalUrl}">${approvalUrl}</a></p>
                    <p>If you did not expect this email, please contact your system administrator.</p>
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  createStatusNotificationTemplate(requestData, status) {
    const isApproved = status === "approved";
    const statusColor = isApproved ? "#4CAF50" : "#f44336";
    const statusText = isApproved ? "APPROVED" : "DENIED";
    const statusIcon = isApproved ? "✅" : "❌";

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fund Request ${statusText}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .request-details { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .amount { font-size: 1.5em; color: ${statusColor}; font-weight: bold; }
            .status-badge { display: inline-block; padding: 10px 20px; background-color: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${statusIcon} Fund Request ${statusText}</h1>
                <p>Your fund request has been ${status}</p>
            </div>
            <div class="content">
                <div style="text-align: center; margin-bottom: 30px;">
                    <span class="status-badge">${statusText}</span>
                </div>
                
                <div class="request-details">
                    <h2>Request Details</h2>
                    <div class="detail-row">
                        <span class="detail-label">Request ID:</span>
                        <span class="detail-value">${requestData.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value amount">${
                          requestData.currency
                        } ${parseFloat(
      requestData.amount
    ).toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Purpose:</span>
                        <span class="detail-value">${requestData.purpose}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value" style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                    </div>
                    ${
                      requestData.approved_by
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Approved by:</span>
                        <span class="detail-value">${requestData.approved_by}</span>
                    </div>
                    `
                        : ""
                    }
                    ${
                      requestData.approval_notes
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Notes:</span>
                        <span class="detail-value">${requestData.approval_notes}</span>
                    </div>
                    `
                        : ""
                    }
                    <div class="detail-row">
                        <span class="detail-label">Decision Date:</span>
                        <span class="detail-value">${new Date().toLocaleString()}</span>
                    </div>
                </div>

                ${
                  isApproved
                    ? `
                <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #d4edda; border-radius: 6px;">
                    <p><strong>🎉 Congratulations! Your fund request has been approved.</strong></p>
                    <p>You will receive further instructions on the next steps for fund disbursement.</p>
                </div>
                `
                    : `
                <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8d7da; border-radius: 6px;">
                    <p><strong>Your fund request has been denied.</strong></p>
                    <p>If you have questions about this decision, please contact your approver.</p>
                </div>
                `
                }

                <div class="footer">
                    <p>This is an automated notification from the Fund Request System.</p>
                    <p>If you have any questions, please contact your system administrator.</p>
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  createConfirmationEmailTemplate(requestData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fund Request Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .request-details { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .amount { font-size: 1.5em; color: #2196F3; font-weight: bold; }
            .success-message { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
            .status-badge { display: inline-block; background-color: #ffc107; color: #212529; padding: 5px 10px; border-radius: 15px; font-size: 0.8em; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Fund Request Submitted Successfully</h1>
                <p>Your request has been received and is under review</p>
            </div>
            <div class="content">
                <div class="success-message">
                    <strong>✅ Success!</strong> Your fund request has been submitted and assigned ID: <strong>#${
                      requestData.id
                    }</strong>
                </div>
                
                <div class="request-details">
                    <h2>Your Request Summary</h2>
                    <div class="detail-row">
                        <span class="detail-label">Request ID:</span>
                        <span class="detail-value">#${requestData.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value"><span class="status-badge">PENDING APPROVAL</span></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value amount">${
                          requestData.currency
                        } ${parseFloat(
      requestData.amount
    ).toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Purpose:</span>
                        <span class="detail-value">${requestData.purpose}</span>
                    </div>
                    ${
                      requestData.description
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${requestData.description}</span>
                    </div>
                    `
                        : ""
                    }
                    ${
                      requestData.department
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Department:</span>
                        <span class="detail-value">${requestData.department}</span>
                    </div>
                    `
                        : ""
                    }
                    ${
                      requestData.category
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${requestData.category}</span>
                    </div>
                    `
                        : ""
                    }
                    <div class="detail-row">
                        <span class="detail-label">Submitted:</span>
                        <span class="detail-value">${new Date(
                          requestData.created_at
                        ).toLocaleString()}</span>
                    </div>
                    ${
                      requestData.approver_email
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Approver:</span>
                        <span class="detail-value">${requestData.approver_email}</span>
                    </div>
                    `
                        : ""
                    }
                </div>

                <div style="background-color: #e7f3ff; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="color: #2196F3; margin-top: 0;">📋 What happens next?</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Your approver will receive an email notification</li>
                        <li>They will review your request and make a decision</li>
                        <li>You'll receive an email update once the decision is made</li>
                        ${
                          requestData.urgent
                            ? "<li><strong>⚠️ Your request is marked as URGENT and will be prioritized</strong></li>"
                            : ""
                        }
                    </ul>
                </div>

                <div class="footer">
                    <p>Keep this email for your records. You can reference your request using ID: <strong>#${
                      requestData.id
                    }</strong></p>
                    <p>If you have any questions about your request, please contact your approver or system administrator.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p><em>This is an automated confirmation email from the Fund Request System.</em></p>
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  createPlainTextConfirmationEmail(requestData) {
    return `
Fund Request Submitted Successfully

Your fund request has been received and is under review.

Request Summary:
- Request ID: #${requestData.id}
- Status: PENDING APPROVAL
- Amount: ${requestData.currency} ${parseFloat(
      requestData.amount
    ).toLocaleString()}
- Purpose: ${requestData.purpose}
${requestData.description ? `- Description: ${requestData.description}` : ""}
${requestData.department ? `- Department: ${requestData.department}` : ""}
${requestData.category ? `- Category: ${requestData.category}` : ""}
- Submitted: ${new Date(requestData.created_at).toLocaleString()}
${requestData.approver_email ? `- Approver: ${requestData.approver_email}` : ""}

What happens next?
• Your approver will receive an email notification
• They will review your request and make a decision
• You'll receive an email update once the decision is made
${
  requestData.urgent
    ? "• ⚠️ Your request is marked as URGENT and will be prioritized"
    : ""
}

Keep this email for your records. You can reference your request using ID: #${
      requestData.id
    }

If you have any questions about your request, please contact your approver or system administrator.

---
Fund Request System
    `;
  }

  createPlainTextEmail(requestData, approvalUrl) {
    return `
Fund Request Approval Required

A new fund request is awaiting your approval.

Request Details:
- Request ID: ${requestData.id}
- Requested by: ${requestData.requester_name} (${requestData.requester_email})
- Amount: ${requestData.currency} ${parseFloat(
      requestData.amount
    ).toLocaleString()}
- Purpose: ${requestData.purpose}
${requestData.description ? `- Description: ${requestData.description}` : ""}
${requestData.department ? `- Department: ${requestData.department}` : ""}
${requestData.category ? `- Category: ${requestData.category}` : ""}
- Submitted: ${new Date(requestData.created_at).toLocaleString()}

Please review this request by visiting: ${approvalUrl}

This link will expire in 7 days.

---
Fund Request System
    `;
  }

  createPlainTextStatusEmail(requestData, status) {
    const statusText = status.toUpperCase();
    return `
Fund Request ${statusText}

Your fund request has been ${status}.

Request Details:
- Request ID: ${requestData.id}
- Amount: ${requestData.currency} ${parseFloat(
      requestData.amount
    ).toLocaleString()}
- Purpose: ${requestData.purpose}
- Status: ${statusText}
${
  requestData.approved_by
    ? `- ${status === "approved" ? "Approved" : "Denied"} by: ${
        requestData.approved_by
      }`
    : ""
}
${requestData.approval_notes ? `- Notes: ${requestData.approval_notes}` : ""}
- Decision Date: ${new Date().toLocaleString()}

---
Fund Request System
    `;
  }

  createApprovalDecisionPDFTemplate(requestData, decision) {
    const isApproved = decision === "approved";
    const status = isApproved ? "Approved" : "Denied";
    const statusColor = isApproved ? "#4CAF50" : "#f44336";

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fund Request Decision Confirmation</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Decision Confirmation</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Fund Request System</p>
              </div>

              <!-- Status Banner -->
              <div style="background-color: ${statusColor}; color: white; padding: 15px; text-align: center;">
                  <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Request ${status}</h2>
              </div>

              <!-- Content -->
              <div style="padding: 30px;">
                  <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                      Dear ${requestData.approved_by || "Approver"},
                  </p>

                  <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
                      This email confirms your decision on the fund request below. A PDF copy of the decision has been attached for your records.
                  </p>

                  <!-- Request Details -->
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #333; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">
                          Request Details
                      </h3>
                      <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #555; width: 30%;">Request ID:</td>
                              <td style="padding: 8px 0; color: #333;">#${requestData._id
                                .toString()
                                .slice(-6)
                                .toUpperCase()}</td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #555;">Requester:</td>
                              <td style="padding: 8px 0; color: #333;">${
                                requestData.requester_name
                              }</td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #555;">Department:</td>
                              <td style="padding: 8px 0; color: #333;">${
                                requestData.department
                              }</td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #555;">Amount:</td>
                              <td style="padding: 8px 0; color: #333; font-weight: bold;">$${parseFloat(
                                requestData.amount
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}</td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #555;">Purpose:</td>
                              <td style="padding: 8px 0; color: #333;">${
                                requestData.purpose
                              }</td>
                          </tr>
                          <tr>
                              <td style="padding: 8px 0; font-weight: bold; color: #555;">Decision Date:</td>
                              <td style="padding: 8px 0; color: #333;">${new Date().toLocaleDateString()}</td>
                          </tr>
                      </table>
                  </div>

                  <!-- Decision Details -->
                  <div style="background-color: ${
                    isApproved ? "#e8f5e8" : "#ffebee"
                  }; border-left: 4px solid ${statusColor}; border-radius: 4px; padding: 15px; margin: 20px 0;">
                      <h4 style="margin: 0 0 10px 0; color: ${statusColor}; font-size: 16px;">Your Decision:</h4>
                      <p style="margin: 0; color: #555; font-size: 15px; font-weight: bold;">${status}</p>
                      ${
                        requestData.approval_notes
                          ? `
                      <p style="margin: 10px 0 0 0; color: #555; font-size: 14px;">
                          <strong>Notes:</strong> ${requestData.approval_notes}
                      </p>
                      `
                          : ""
                      }
                  </div>

                  <div style="background-color: #e3f2fd; border-radius: 6px; padding: 15px; margin: 25px 0;">
                      <p style="margin: 0; color: #1976d2; font-size: 14px; text-align: center;">
                          📎 <strong>Attachment:</strong> PDF copy of the approval decision is included with this email
                      </p>
                  </div>

                  <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                      Best regards,<br>
                      <strong>Fund Request System</strong><br>
                      <em>Automated Decision Confirmation</em>
                  </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #6c757d; font-size: 12px;">
                      This is an automated message from the Fund Request System.<br>
                      Please keep this confirmation for your records.
                  </p>
                  <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 11px;">
                      © ${new Date().getFullYear()} Fund Request System. All rights reserved.
                  </p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  createPlainTextApprovalDecisionPDF(requestData, decision) {
    const isApproved = decision === "approved";
    const status = isApproved ? "APPROVED" : "DENIED";

    return `
FUND REQUEST DECISION CONFIRMATION
===================================

Dear ${requestData.approved_by || "Approver"},

This email confirms your decision on the fund request below. A PDF copy of the decision has been attached for your records.

REQUEST DETAILS:
- Request ID: #${requestData._id.toString().slice(-6).toUpperCase()}
- Requester: ${requestData.requester_name}
- Department: ${requestData.department}
- Amount: $${parseFloat(requestData.amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}
- Purpose: ${requestData.purpose}
- Decision Date: ${new Date().toLocaleDateString()}

YOUR DECISION: ${status}
${
  requestData.approval_notes
    ? `Notes: ${requestData.approval_notes}`
    : "No additional notes provided"
}

ATTACHMENT: PDF copy of the approval decision is included with this email.

---
Best regards,
Fund Request System
Automated Decision Confirmation

This is an automated message from the Fund Request System.
Please keep this confirmation for your records.
    `;
  }
}

const emailService = new EmailService();

module.exports = emailService;
