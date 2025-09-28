const nodemailer = require("nodemailer");
const {
  createBeautifulApprovalRequestTemplate,
  createBeautifulApprovalTemplate,
  createBeautifulDenialTemplate
} = require("./beautifulEmailTemplates");
require("dotenv").config();

class EmailService {
  constructor() {
    // Initialize SMTP with enhanced configuration for reliability
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
    console.log("📧 Using SMTP for email service");
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
  async sendEmailWithRetry(mailOptions, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Sending email (attempt ${attempt}/${maxRetries})...`);
        const result = await this.transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully:", result.messageId);
        return result;
      } catch (error) {
        console.error(
          `❌ Email sending failed (attempt ${attempt}/${maxRetries}):`,
          error.message
        );

        if (attempt === maxRetries) {
          // Final attempt failed - throw error to properly indicate failure
          console.error(
            "❌ All email attempts failed. Email could not be delivered."
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
    const approverEmails = approvers.map((approver) => approver.email);
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

    const approvalUrl = `${process.env.FRONTEND_URL}/approve/${fundRequest.approvalToken}`;

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

    return await this.sendEmailWithRetry(mailOptions);
  }


  async sendStatusNotification(fundRequest, status, approver, comments = "") {
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
      html: status === "approved" 
        ? createBeautifulApprovalTemplate(fundRequest, approver, comments)
        : createBeautifulDenialTemplate(fundRequest, approver, comments),
    };

    return await this.sendEmailWithRetry(mailOptions);
  }

  async sendApprovalDecisionPDF(fundRequest, status, approver, pdfBuffer) {
      from: process.env.EMAIL_USER,
      to: fundRequest.requester_email,
      subject: `${statusEmoji} Fund Request ${statusText}: ${fundRequest.purpose} - ${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fund Request Decision</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                  
                  <!-- Status Header -->
                  <tr>
                    <td style="background: ${headerBg}; padding: 30px 40px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">${statusEmoji}</div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        Request ${statusText}
                      </h1>
                      <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                        Your fund request decision has been finalized
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Status Badge -->
                  <tr>
                    <td style="padding: 0; text-align: center;">
                      <div style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 12px 25px; border-radius: 0 0 20px 20px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                        ${statusIcon} ${statusText}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      
                      <!-- Decision Summary -->
                      <div style="background: ${statusBg}; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid ${statusColor};">
                        <h2 style="color: ${statusColor}; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                          📋 Request Decision Summary
                        </h2>
                        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; width: 140px; vertical-align: top;">Request:</td>
                            <td style="color: #2c3e50; font-weight: 500; border-left: 2px solid ${statusColor}; padding-left: 15px;">${
        fundRequest.title
      }</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Amount:</td>
                            <td style="color: ${
                              status === "approved" ? "#28a745" : "#6c757d"
                            }; font-weight: 700; font-size: 18px; border-left: 2px solid ${statusColor}; padding-left: 15px;">${formattedAmount}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Status:</td>
                            <td style="color: ${statusColor}; font-weight: 700; font-size: 16px; border-left: 2px solid ${statusColor}; padding-left: 15px;">${statusEmoji} ${statusText}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Reviewed by:</td>
                            <td style="color: #6f42c1; font-weight: 500; border-left: 2px solid ${statusColor}; padding-left: 15px;">👨‍💼 ${approver}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Decision Date:</td>
                            <td style="color: #2c3e50; font-weight: 500; border-left: 2px solid ${statusColor}; padding-left: 15px;">📅 ${new Date().toLocaleDateString(
        "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )}</td>
                          </tr>
                        </table>
                      </div>
                      
                      ${
                        comments
                          ? `
                      <!-- Comments Section -->
                      <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #6c757d;">
                        <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                          💬 Reviewer Comments
                        </h3>
                        <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">
                          <p style="color: #495057; margin: 0; line-height: 1.6; font-style: italic; font-size: 16px;">
                            "${comments}"
                          </p>
                        </div>
                      </div>
                      `
                          : ""
                      }
                      
                      <!-- Next Steps -->
                      <div style="background-color: ${
                        status === "approved" ? "#e8f5e8" : "#fff3cd"
                      }; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid ${
        status === "approved" ? "#28a745" : "#ffc107"
      };">
                        <h3 style="color: ${
                          status === "approved" ? "#155724" : "#856404"
                        }; margin: 0 0 15px 0; font-size: 18px;">
                          ${
                            status === "approved"
                              ? "🚀 Next Steps"
                              : "💡 What You Can Do"
                          }
                        </h3>
                        <div style="color: ${
                          status === "approved" ? "#155724" : "#856404"
                        }; line-height: 1.6;">
                          ${
                            status === "approved"
                              ? `
                            <p style="margin: 0 0 10px 0;"><strong>✅ Your request has been approved!</strong></p>
                            <ul style="margin: 0; padding-left: 20px;">
                              <li>Funds processing will begin shortly</li>
                              <li>You may receive additional documentation or forms to complete</li>
                              <li>Expected processing time: 2-3 business days</li>
                              <li>You will be notified when funds are disbursed</li>
                            </ul>
                          `
                              : `
                            <p style="margin: 0 0 10px 0;"><strong>❌ Your request was not approved at this time.</strong></p>
                            <ul style="margin: 0; padding-left: 20px;">
                              <li>Review the comments above for specific feedback</li>
                              <li>You may submit a revised request if appropriate</li>
                              <li>Contact your approver for clarification if needed</li>
                              <li>Consider addressing the concerns mentioned before resubmitting</li>
                            </ul>
                          `
                          }
                        </div>
                      </div>
                      
                      <!-- Contact Information -->
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e9ecef;">
                        <h4 style="color: #495057; margin: 0 0 10px 0; font-size: 16px;">📞 Questions or Concerns?</h4>
                        <p style="color: #6c757d; margin: 0; line-height: 1.5;">
                          If you have any questions about this decision, please contact<br>
                          <strong style="color: #007bff;">${approver}</strong> directly for clarification.
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                      <p style="color: #bdc3c7; margin: 0; font-size: 14px; line-height: 1.5;">
                        🤖 This is an automated notification from the Fund Request System.<br>
                        Please do not reply to this email. For support, contact your system administrator.
                      </p>
                      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #34495e;">
                        <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                          © 2025 Fund Request Management System | Secure & Confidential
                        </p>
                      </div>
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

    return await this.sendEmailWithRetry(mailOptions);
  }

  async sendApprovalDecisionPDF(fundRequest, status, approver, pdfBuffer) {
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
        <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px 40px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">${documentIcon}</div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        Official Fund Request Document
                      </h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
                        Your official approval document is attached
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Status Badge -->
                  <tr>
                    <td style="padding: 0; text-align: center;">
                      <div style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 10px 20px; border-radius: 0 0 20px 20px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                        ${statusEmoji} ${statusText}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      
                      <!-- Document Info -->
                      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #6c757d;">
                        <h2 style="color: #495057; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                          📋 Document Information
                        </h2>
                        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; width: 140px; vertical-align: top;">Request:</td>
                            <td style="color: #2c3e50; font-weight: 500; border-left: 2px solid #6c757d; padding-left: 15px;">${
                              fundRequest.purpose
                            }</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Amount:</td>
                            <td style="color: #28a745; font-weight: 700; font-size: 18px; border-left: 2px solid #6c757d; padding-left: 15px;">${formattedAmount}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Final Status:</td>
                            <td style="color: ${statusColor}; font-weight: 700; border-left: 2px solid #6c757d; padding-left: 15px;">${statusEmoji} ${statusText}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Reviewed by:</td>
                            <td style="color: #6f42c1; font-weight: 500; border-left: 2px solid #6c757d; padding-left: 15px;">👨‍💼 ${approver}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Document Date:</td>
                            <td style="color: #2c3e50; font-weight: 500; border-left: 2px solid #6c757d; padding-left: 15px;">📅 ${new Date().toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}</td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- PDF Attachment Info -->
                      <div style="background-color: #e7f3ff; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #007bff;">
                        <h3 style="color: #004085; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                          📎 Attached Document
                        </h3>
                        <div style="background-color: white; border-radius: 8px; padding: 20px; border: 2px dashed #007bff;">
                          <div style="text-align: center;">
                            <div style="font-size: 32px; margin-bottom: 10px;">📄</div>
                            <p style="color: #004085; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">
                              fund-request-${status}-${
        fundRequest._id || "document"
      }.pdf
                            </p>
                            <p style="color: #6c757d; margin: 0; font-size: 14px;">
                              This PDF contains the complete details and official approval status for your fund request.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Important Notes -->
                      <div style="background-color: #fff3cd; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #ffc107;">
                        <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">
                          ⚠️ Important Notes
                        </h3>
                        <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
                          <li><strong>Keep this document safe</strong> - This is your official record</li>
                          <li><strong>Print if necessary</strong> - You may need hard copies for your records</li>
                          <li><strong>Share with relevant parties</strong> - Forward to accounting or finance as needed</li>
                          <li><strong>Reference number</strong> - Use this document for any future correspondence</li>
                        </ul>
                      </div>
                      
                      <!-- Support Info -->
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e9ecef;">
                        <h4 style="color: #495057; margin: 0 0 10px 0; font-size: 16px;">💬 Questions About This Document?</h4>
                        <p style="color: #6c757d; margin: 0; line-height: 1.5;">
                          If you have questions about this official document or need additional copies,<br>
                          please contact <strong style="color: #007bff;">${approver}</strong> or your system administrator.
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                      <p style="color: #bdc3c7; margin: 0; font-size: 14px; line-height: 1.5;">
                        🔒 This document contains confidential information.<br>
                        Please handle according to your organization's security policies.
                      </p>
                      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #34495e;">
                        <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                          © 2025 Fund Request Management System | Official Document
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `fund-request-${status}-${
            fundRequest._id || new Date().getTime()
          }.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    return await this.sendEmailWithRetry(mailOptions);
  }

  async sendApprovalEmail(requestData) {
    // Create approvers array from the single approver_email
    const approvers = [{ email: requestData.approver_email }];

    // Convert requestData to the format expected by sendFundRequestNotification
    const fundRequest = {
      title: `${requestData.purpose}`,
      amount: requestData.amount,
      currency: requestData.currency,
      urgency: requestData.urgent ? "High" : "Normal",
      requestedDate: requestData.created_at || new Date(),
      requesterName: requestData.requester_name,
      department: requestData.department || "N/A",
      description: requestData.description || requestData.purpose,
      approvalToken: requestData.approval_token,
    };

    // Use the existing sendFundRequestNotification method
    return await this.sendFundRequestNotification(fundRequest, approvers);
  }

  async sendConfirmationEmail(requestData) {
    const formattedAmount = this.formatCurrency(
      requestData.amount,
      requestData.currency
    );
    const urgencyIcon = requestData.urgent ? "🚨" : "✅";
    const urgencyColor = requestData.urgent ? "#e74c3c" : "#28a745";
    const trackingNumber = `FR-${new Date().getFullYear()}-${requestData.id
      .slice(-8)
      .toUpperCase()}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: requestData.requester_email,
      subject: `${urgencyIcon} Fund Request Confirmed: ${requestData.purpose} - ${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fund Request Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f8f0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f8f0; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                  
                  <!-- Success Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px 40px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                      <h1 style="color: #040404ff; margin: 0; font-size: 26px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        Request Submitted Successfully!
                      </h1>
                      <p style="color: #0a0a0aff; margin: 8px 0 0 0; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                        Your fund request is now in the approval queue
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Tracking Number -->
                  <tr>
                    <td style="padding: 0; text-align: center;">
                      <div style="display: inline-block; background-color: #17a2b8; color: #ffffff; padding: 12px 25px; border-radius: 0 0 20px 20px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                        📋 Tracking: ${trackingNumber}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      
                      <!-- Personal Greeting -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 22px;">
                          Dear ${requestData.requester_name},
                        </h2>
                        <p style="color: #6c757d; margin: 0; font-size: 16px; line-height: 1.5;">
                          Thank you for submitting your fund request. We have received your application and it is now being processed.
                        </p>
                      </div>
                      
                      <!-- Request Summary -->
                      <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #28a745;">
                        <h3 style="color: #155724; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                          📊 Your Request Summary
                        </h3>
                        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; width: 140px; vertical-align: top;">Request ID:</td>
                            <td style="color: #495057; font-weight: 700; font-family: monospace; border-left: 2px solid #28a745; padding-left: 15px;">${trackingNumber}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Purpose:</td>
                            <td style="color: #2c3e50; font-weight: 500; border-left: 2px solid #28a745; padding-left: 15px;">${
                              requestData.purpose
                            }</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Amount:</td>
                            <td style="color: #28a745; font-weight: 700; font-size: 20px; border-left: 2px solid #28a745; padding-left: 15px;">${formattedAmount}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Department:</td>
                            <td style="color: #6f42c1; font-weight: 500; border-left: 2px solid #28a745; padding-left: 15px;">🏢 ${
                              requestData.department || "Not Specified"
                            }</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Priority:</td>
                            <td style="color: ${urgencyColor}; font-weight: 600; border-left: 2px solid #28a745; padding-left: 15px;">
                              ${
                                requestData.urgent
                                  ? "🚨 HIGH PRIORITY"
                                  : "📋 NORMAL PRIORITY"
                              }
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Submitted:</td>
                            <td style="color: #2c3e50; font-weight: 500; border-left: 2px solid #28a745; padding-left: 15px;">📅 ${new Date().toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}</td>
                          </tr>
                          <tr>
                            <td style="color: #6c757d; font-weight: 600; vertical-align: top;">Approval Token:</td>
                            <td style="color: #6f42c1; font-weight: 600; font-family: 'Courier New', monospace; border-left: 2px solid #28a745; padding-left: 15px; background-color: #f8f9fa; padding: 8px 15px; border-radius: 4px;">🔑 ${
                              requestData.approval_token || "Generating..."
                            }</td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- Next Steps -->
                      <div style="background-color: #e7f3ff; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #007bff;">
                        <h3 style="color: #004085; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                          🚀 What Happens Next?
                        </h3>
                        <div style="color: #004085;">
                          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                            <div style="background-color: #007bff; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">1</div>
                            <div style="line-height: 1.5;">
                              <strong>Review Process:</strong> Your request will be reviewed by <span style="color: #007bff; font-weight: 600;">${
                                requestData.approver_email
                              }</span>
                            </div>
                          </div>
                          <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                            <div style="background-color: #007bff; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">2</div>
                            <div style="line-height: 1.5;">
                              <strong>Expected Timeline:</strong> ${
                                requestData.urgent
                                  ? "High priority requests are typically reviewed within 24-48 hours"
                                  : "Normal requests are typically reviewed within 3-5 business days"
                              }
                            </div>
                          </div>
                          <div style="display: flex; align-items: flex-start;">
                            <div style="background-color: #007bff; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">3</div>
                            <div style="line-height: 1.5;">
                              <strong>Notification:</strong> You'll receive an email notification once a decision is made on your request
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Tips Section -->
                      <div style="background-color: #fff3cd; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #ffc107;">
                        <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">
                          💡 Helpful Tips
                        </h3>
                        <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
                          <li><strong>Keep your tracking number safe:</strong> <code style="background-color: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${trackingNumber}</code> for future reference</li>
                          <li><strong>Check your email regularly</strong> for updates on your request status</li>
                          <li><strong>Contact support</strong> if you need to make changes to your request</li>
                          <li><strong>Be available</strong> to provide additional information if requested</li>
                        </ul>
                      </div>
                      
                      <!-- Contact Info -->
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e9ecef;">
                        <h4 style="color: #495057; margin: 0 0 10px 0; font-size: 16px;">📞 Need Help?</h4>
                        <p style="color: #6c757d; margin: 0; line-height: 1.5;">
                          If you have any questions about your request, please contact our support team<br>
                          or reach out to your designated approver directly.
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                      <p style="color: #bdc3c7; margin: 0; font-size: 14px; line-height: 1.5;">
                        🤖 This is an automated confirmation from the Fund Request System.<br>
                        Please do not reply to this email. For support, contact your system administrator.
                      </p>
                      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #34495e;">
                        <p style="color: #7f8c8d; margin: 0; font-size: 12px;">
                          © 2025 Fund Request Management System | Secure & Confidential
                        </p>
                      </div>
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

    return await this.sendEmailWithRetry(mailOptions);
  }
}

module.exports = new EmailService();
