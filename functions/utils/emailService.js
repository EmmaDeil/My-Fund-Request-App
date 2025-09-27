const nodemailer = require("nodemailer");const nodemailer = require("nodemailer");

require("dotenv").config();const sgMail = require("@sendgrid/mail");

require("dotenv").config();

class EmailService {

  constructor() {class EmailService {

    // Initialize SMTP for email service  constructor() {

    this.transporter = nodemailer.createTransport({    // Determine which email service to use based on environment

      host: process.env.EMAIL_HOST,    this.usesSendGrid =

      port: parseInt(process.env.EMAIL_PORT),      process.env.NODE_ENV === "production" && process.env.SENDGRID_API_KEY;

      secure: process.env.EMAIL_SECURE === "true",

      auth: {    if (this.usesSendGrid) {

        user: process.env.EMAIL_USER,      // Initialize SendGrid for production

        pass: process.env.EMAIL_PASS,      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      },      console.log("��� Using SendGrid for email service (Production)");

    });    } else {

    console.log("📧 Using SMTP for email service");      // Initialize SMTP for development

  }      this.transporter = nodemailer.createTransport({

        host: process.env.EMAIL_HOST,

  async verifyConnection() {        port: parseInt(process.env.EMAIL_PORT),

    try {        secure: process.env.EMAIL_SECURE === "true",

      await this.transporter.verify();        auth: {

      console.log("📧 SMTP email service connected successfully");          user: process.env.EMAIL_USER,

      return true;          pass: process.env.EMAIL_PASS,

    } catch (error) {        },

      console.error("❌ SMTP email service connection failed:", error.message);      });

      return false;      console.log("��� Using SMTP for email service (Development)");

    }    }

  }  }



  async sendApprovalEmail(requestData, pdfBuffer = null) {  async verifyConnection() {

    const approvalUrl = `${process.env.FRONTEND_URL}/approve/${requestData.approval_token}`;    if (this.usesSendGrid) {

    const emailTemplate = this.createApprovalEmailTemplate(requestData, approvalUrl);      // SendGrid doesn't have a verify method like nodemailer

      console.log("��� SendGrid email service configured");

    const mailOptions = {      return true;

      from: {    } else {

        name: "Fund Request System",      try {

        address: process.env.EMAIL_USER,        await this.transporter.verify();

      },        console.log("��� SMTP email service connected successfully");

      to: requestData.approver_email,        return true;

      subject: `Fund Request Approval Required - ${requestData.requester_name}`,      } catch (error) {

      html: emailTemplate,        console.error(

      text: this.createPlainTextEmail(requestData, approvalUrl),          "❌ SMTP email service connection failed:",

    };          error.message

        );

    // Add PDF attachment if provided        return false;

    if (pdfBuffer) {      }

      mailOptions.attachments = [    }

        {  }

          filename: `fund-request-${requestData.id}.pdf`,

          content: pdfBuffer,  async sendApprovalEmail(requestData, pdfBuffer = null) {

          contentType: "application/pdf",    const approvalUrl = `${process.env.FRONTEND_URL}/approve/${requestData.approval_token}`;

        },

      ];    if (this.usesSendGrid) {

    }      return this.sendApprovalEmailSendGrid(

        requestData,

    try {        approvalUrl,

      const result = await this.transporter.sendMail(mailOptions);        pdfBuffer

      console.log("📧 Approval email sent successfully via SMTP to:", requestData.approver_email);      );

      return result;    } else {

    } catch (error) {      return this.sendApprovalEmailSMTP(requestData, approvalUrl, pdfBuffer);

      console.error("❌ Failed to send approval email via SMTP:", error.message);    }

      throw error;  }

    }

  }  async sendApprovalEmailSMTP(requestData, approvalUrl, pdfBuffer = null) {

    const emailTemplate = this.createApprovalEmailTemplate(

  async sendConfirmationEmail(requestData, pdfBuffer = null) {      requestData,

    const emailTemplate = this.createConfirmationEmailTemplate(requestData);      approvalUrl

    );

    const mailOptions = {

      from: {    const mailOptions = {

        name: "Fund Request System",      from: {

        address: process.env.EMAIL_USER,        name: "Fund Request System",

      },        address: process.env.EMAIL_USER,

      to: requestData.requester_email,      },

      subject: `Fund Request Submitted - ${requestData.id}`,      to: requestData.approver_email,

      html: emailTemplate,      subject: `Fund Request Approval Required - ${requestData.requester_name}`,

      text: this.createPlainTextConfirmationEmail(requestData),      html: emailTemplate,

    };      text: this.createPlainTextEmail(requestData, approvalUrl),

    };

    // Add PDF attachment if provided

    if (pdfBuffer) {    // Add PDF attachment if provided

      mailOptions.attachments = [    if (pdfBuffer) {

        {      mailOptions.attachments = [

          filename: `fund-request-${requestData.id}.pdf`,        {

          content: pdfBuffer,          filename: `fund-request-${requestData.id}.pdf`,

          contentType: "application/pdf",          content: pdfBuffer,

        },          contentType: "application/pdf",

      ];        },

    }      ];

    }

    try {

      const result = await this.transporter.sendMail(mailOptions);    try {

      console.log("📧 Confirmation email sent successfully via SMTP to:", requestData.requester_email);      const result = await this.transporter.sendMail(mailOptions);

      return result;      console.log(

    } catch (error) {        "��� Approval email sent successfully via SMTP to:",

      console.error("❌ Failed to send confirmation email via SMTP:", error.message);        requestData.approver_email

      throw error;      );

    }      return result;

  }    } catch (error) {

      console.error(

  createApprovalEmailTemplate(requestData, approvalUrl) {        "❌ Failed to send approval email via SMTP:",

    return `<!DOCTYPE html>        error.message

<html>      );

<head>      throw error;

  <meta charset="utf-8">    }

  <style>  }

    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }

    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }  async sendApprovalEmailSendGrid(requestData, approvalUrl, pdfBuffer = null) {

    .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }    const emailTemplate = this.createApprovalEmailTemplate(

    .header h1 { color: #007bff; margin: 0; }      requestData,

    .content { line-height: 1.6; color: #333; }      approvalUrl

    .highlight { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }    );

    .approve-btn { display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }

    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }    const msg = {

    table { width: 100%; border-collapse: collapse; margin: 20px 0; }      to: requestData.approver_email,

    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }      from: {

    th { background-color: #f8f9fa; font-weight: bold; }        name: "Fund Request System",

  </style>        email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,

</head>      },

<body>      subject: `Fund Request Approval Required - ${requestData.requester_name}`,

  <div class="container">      html: emailTemplate,

    <div class="header">      text: this.createPlainTextEmail(requestData, approvalUrl),

      <h1>🏦 Fund Request Approval Required</h1>    };

    </div>

    <div class="content">    // Add PDF attachment if provided

      <p>Hello,</p>    if (pdfBuffer) {

      <p>A new fund request has been submitted and requires your approval:</p>      msg.attachments = [

      <div class="highlight">        {

        <h3>Request Summary</h3>          filename: `fund-request-${requestData.id}.pdf`,

        <table>          content: pdfBuffer.toString("base64"),

          <tr><th>Request ID:</th><td><strong>${requestData.id}</strong></td></tr>          type: "application/pdf",

          <tr><th>Requester:</th><td>${requestData.requester_name}</td></tr>          disposition: "attachment",

          <tr><th>Email:</th><td>${requestData.requester_email}</td></tr>        },

          <tr><th>Department:</th><td>${requestData.department}</td></tr>      ];

          <tr><th>Amount:</th><td><strong>$${parseFloat(requestData.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></td></tr>    }

          <tr><th>Purpose:</th><td>${requestData.purpose}</td></tr>

          <tr><th>Urgency:</th><td>${requestData.urgency}</td></tr>    try {

          <tr><th>Submitted:</th><td>${new Date(requestData.created_at).toLocaleDateString()}</td></tr>      const result = await sgMail.send(msg);

        </table>      console.log(

      </div>        "��� Approval email sent successfully via SendGrid to:",

      ${requestData.description ? `<div style="margin: 20px 0;"><h3>Additional Details:</h3><p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">${requestData.description}</p></div>` : ''}        requestData.approver_email

      <div style="text-align: center; margin: 30px 0;">      );

        <h3>Action Required</h3>      return result;

        <p>Please review this request and take appropriate action:</p>    } catch (error) {

        <a href="${approvalUrl}" class="approve-btn">👍 Review & Approve Request</a>      console.error(

      </div>        "❌ Failed to send approval email via SendGrid:",

    </div>        error.message

    <div class="footer">      );

      <p>This email was sent by the Fund Request Management System</p>      throw error;

      <p>If you have any questions, please contact IT support</p>    }

    </div>  }

  </div>

</body>  async sendConfirmationEmail(requestData, pdfBuffer = null) {

</html>`;    if (this.usesSendGrid) {

  }      return this.sendConfirmationEmailSendGrid(requestData, pdfBuffer);

    } else {

  createConfirmationEmailTemplate(requestData) {      return this.sendConfirmationEmailSMTP(requestData, pdfBuffer);

    return `<!DOCTYPE html>    }

<html>  }

<head>

  <meta charset="utf-8">  async sendConfirmationEmailSMTP(requestData, pdfBuffer = null) {

  <style>    const emailTemplate = this.createConfirmationEmailTemplate(requestData);

    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }

    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }    const mailOptions = {

    .header { text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 20px; margin-bottom: 30px; }      from: {

    .header h1 { color: #28a745; margin: 0; }        name: "Fund Request System",

    .content { line-height: 1.6; color: #333; }        address: process.env.EMAIL_USER,

    .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }      },

    .info-box { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }      to: requestData.requester_email,

    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }      subject: `Fund Request Submitted - ${requestData.id}`,

    table { width: 100%; border-collapse: collapse; margin: 20px 0; }      html: emailTemplate,

    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }      text: this.createPlainTextConfirmationEmail(requestData),

    th { background-color: #f8f9fa; font-weight: bold; }    };

  </style>

</head>    // Add PDF attachment if provided

<body>    if (pdfBuffer) {

  <div class="container">      mailOptions.attachments = [

    <div class="header">        {

      <h1>✅ Fund Request Submitted Successfully</h1>          filename: `fund-request-${requestData.id}.pdf`,

    </div>          content: pdfBuffer,

    <div class="content">          contentType: "application/pdf",

      <p>Dear ${requestData.requester_name},</p>        },

      <div class="success-box">      ];

        <h3 style="margin-top: 0;">🎉 Request Submitted!</h3>    }

        <p style="margin-bottom: 0;">Your fund request has been successfully submitted and is now under review.</p>

      </div>    try {

      <div class="info-box">      const result = await this.transporter.sendMail(mailOptions);

        <h3>Your Request Details</h3>      console.log(

        <table>        "��� Confirmation email sent successfully via SMTP to:",

          <tr><th>Request ID:</th><td><strong>${requestData.id}</strong></td></tr>        requestData.requester_email

          <tr><th>Amount:</th><td><strong>$${parseFloat(requestData.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></td></tr>      );

          <tr><th>Purpose:</th><td>${requestData.purpose}</td></tr>      return result;

          <tr><th>Department:</th><td>${requestData.department}</td></tr>    } catch (error) {

          <tr><th>Urgency Level:</th><td>${requestData.urgency}</td></tr>      console.error(

          <tr><th>Submitted Date:</th><td>${new Date(requestData.created_at).toLocaleDateString()}</td></tr>        "❌ Failed to send confirmation email via SMTP:",

          <tr><th>Status:</th><td><span style="color: #ffc107; font-weight: bold;">Pending Approval</span></td></tr>        error.message

        </table>      );

      </div>      throw error;

      ${requestData.description ? `<div style="margin: 20px 0;"><h3>Additional Details Provided:</h3><p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">${requestData.description}</p></div>` : ''}    }

    </div>  }

    <div class="footer">

      <p>This confirmation was sent by the Fund Request Management System</p>  async sendConfirmationEmailSendGrid(requestData, pdfBuffer = null) {

      <p>If you have any questions about your request, please contact your supervisor or IT support</p>    const emailTemplate = this.createConfirmationEmailTemplate(requestData);

    </div>

  </div>    const msg = {

</body>      to: requestData.requester_email,

</html>`;      from: {

  }        name: "Fund Request System",

        email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,

  createPlainTextEmail(requestData, approvalUrl) {      },

    return `Fund Request Approval Required      subject: `Fund Request Submitted - ${requestData.id}`,

      html: emailTemplate,

Request Details:      text: this.createPlainTextConfirmationEmail(requestData),

- Request ID: ${requestData.id}    };

- Requester: ${requestData.requester_name} (${requestData.requester_email})

- Department: ${requestData.department}    // Add PDF attachment if provided

- Amount: $${parseFloat(requestData.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}    if (pdfBuffer) {

- Purpose: ${requestData.purpose}      msg.attachments = [

- Urgency: ${requestData.urgency}        {

- Submitted: ${new Date(requestData.created_at).toLocaleDateString()}          filename: `fund-request-${requestData.id}.pdf`,

          content: pdfBuffer.toString("base64"),

${requestData.description ? `Additional Details: ${requestData.description}` : ''}          type: "application/pdf",

          disposition: "attachment",

To approve or reject this request, please visit:        },

${approvalUrl}      ];

    }

This approval link will expire after 7 days.

    try {

---      const result = await sgMail.send(msg);

Fund Request Management System`;      console.log(

  }        "��� Confirmation email sent successfully via SendGrid to:",

        requestData.requester_email

  createPlainTextConfirmationEmail(requestData) {      );

    return `Fund Request Submitted Successfully      return result;

    } catch (error) {

Dear ${requestData.requester_name},      console.error(

        "❌ Failed to send confirmation email via SendGrid:",

Your fund request has been successfully submitted and is now under review.        error.message

      );

Request Details:      throw error;

- Request ID: ${requestData.id}    }

- Amount: $${parseFloat(requestData.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}  }

- Purpose: ${requestData.purpose}

- Department: ${requestData.department}  createApprovalEmailTemplate(requestData, approvalUrl) {

- Urgency Level: ${requestData.urgency}    return `<!DOCTYPE html>

- Submitted Date: ${new Date(requestData.created_at).toLocaleDateString()}<html>

- Status: Pending Approval<head>

  <meta charset="utf-8">

${requestData.description ? `Additional Details: ${requestData.description}` : ''}  <style>

    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }

What Happens Next:    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }

1. Your request has been sent to the appropriate approver    .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }

2. Most requests are reviewed within 2-3 business days    .header h1 { color: #007bff; margin: 0; }

3. You'll receive an email once a decision is made    .content { line-height: 1.6; color: #333; }

4. The approver may contact you for additional information    .highlight { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }

    .approve-btn { display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }

Please keep this email and your Request ID (${requestData.id}) for your records.    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }

    table { width: 100%; border-collapse: collapse; margin: 20px 0; }

---    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }

Fund Request Management System`;    th { background-color: #f8f9fa; font-weight: bold; }

  }  </style>

}</head>

<body>

module.exports = EmailService;  <div class="container">
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
