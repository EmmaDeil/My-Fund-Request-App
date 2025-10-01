const nodemailer = require("nodemailer");
const {
  createBeautifulApprovalRequestTemplate,
  createBeautifulApprovalTemplate,
  createBeautifulDenialTemplate,
} = require("./beautifulEmailTemplates");

class EmailServiceRenderOptimized {
  constructor() {
    // Render-optimized Gmail configuration
    this.transporter = nodemailer.createTransport({
      service: "gmail", // Let Gmail service handle host/port automatically
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Optimized timeouts for serverless
      connectionTimeout: 30000, // 30 seconds
      socketTimeout: 30000,
      pool: false, // No connection pooling
      maxConnections: 1, // Single connection
      rateDelta: 20000, // 20 seconds between connections
      rateLimit: 5, // Max 5 emails per rateDelta
      tls: {
        rejectUnauthorized: false,
        secureProtocol: "TLSv1_2_method", // Force TLS 1.2
      },
      debug: process.env.NODE_ENV === "production", // Enable debug in production
      logger: process.env.NODE_ENV === "production",
    });

    console.log("📧 Using Render-optimized Gmail SMTP service");
    console.log(`📧 Auth User: ${process.env.EMAIL_USER}`);
  }

  async verifyConnection() {
    try {
      // Shorter timeout for verification in serverless
      const verifyPromise = this.transporter.verify();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("SMTP verification timeout (20s)")),
          20000
        )
      );

      await Promise.race([verifyPromise, timeoutPromise]);
      console.log("✅ SMTP email service verified successfully");
      return true;
    } catch (error) {
      console.error(
        "❌ SMTP email service verification failed:",
        error.message
      );
      // Don't throw error - continue anyway for serverless resilience
      return false;
    }
  }

  formatCurrency(amount, currency = "NGN") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  // Render-optimized email sending with aggressive retry and fallback
  async sendEmailWithRetry(mailOptions, maxRetries = 3, requestId = "Unknown") {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📧 [Request ID: ${requestId}] Sending email (attempt ${attempt}/${maxRetries}) to: ${mailOptions.to}`
        );

        // Skip verification on retry attempts to save time
        if (attempt === 1) {
          console.log(`🔍 [Request ID: ${requestId}] Quick SMTP check...`);
          const verified = await this.verifyConnection();
          if (!verified) {
            console.warn(
              `⚠️ [Request ID: ${requestId}] SMTP verification failed, but continuing anyway`
            );
          }
        }

        // Use Promise.race to implement our own timeout
        const sendPromise = this.transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Email send timeout (45s)")), 45000)
        );

        const result = await Promise.race([sendPromise, timeoutPromise]);

        console.log(
          `✅ [Request ID: ${requestId}] Email sent successfully! Message ID: ${result.messageId}`
        );
        return result;
      } catch (error) {
        const errorType = error.code || error.errno || "UNKNOWN";
        console.error(
          `❌ [Request ID: ${requestId}] Email sending failed (attempt ${attempt}/${maxRetries}) - Error Type: ${errorType}:`,
          error.message
        );

        // Log additional error details for debugging
        if (error.message.includes("timeout") || errorType === "ETIMEDOUT") {
          console.error(
            `⏰ [Request ID: ${requestId}] Timeout error. This may indicate network issues in Render environment.`
          );
        } else if (errorType === "EAUTH") {
          console.error(
            `🔐 [Request ID: ${requestId}] Authentication failed. Check EMAIL_USER and EMAIL_PASS credentials.`
          );
        } else if (errorType === "ECONNECTION" || errorType === "ENOTFOUND") {
          console.error(
            `🌐 [Request ID: ${requestId}] Connection error. Check network connectivity and DNS resolution.`
          );
        }

        if (attempt === maxRetries) {
          // Final attempt failed
          console.error(
            `❌ [Request ID: ${requestId}] All email attempts failed. Email could not be delivered.`
          );
          throw new Error(
            `Email delivery failed after ${maxRetries} attempts: [${errorType}] ${error.message}`
          );
        }

        // Exponential backoff with jitter for serverless
        const baseDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        const jitter = Math.random() * 1000; // Add up to 1s random delay
        const delay = baseDelay + jitter;

        console.log(
          `⏳ [Request ID: ${requestId}] Waiting ${Math.round(
            delay / 1000
          )}s before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Create fresh transporter for retry to avoid connection issues
        if (attempt < maxRetries) {
          console.log(
            `🔄 [Request ID: ${requestId}] Creating fresh connection for retry`
          );
          this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            connectionTimeout: 30000,
            socketTimeout: 30000,
            pool: false,
            maxConnections: 1,
            debug: false, // Disable debug for retries
            logger: false,
          });
        }
      }
    }
  }

  // Rest of the methods remain the same but use the optimized sendEmailWithRetry
  async sendApprovalRequestNotification(fundRequest) {
    const template = createBeautifulApprovalRequestTemplate(fundRequest);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: template.subject,
      html: template.html,
    };

    return await this.sendEmailWithRetry(mailOptions, 3, fundRequest.id);
  }

  async sendApprovalNotification(fundRequest) {
    const template = createBeautifulApprovalTemplate(fundRequest);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: fundRequest.requester_email,
      subject: template.subject,
      html: template.html,
    };

    return await this.sendEmailWithRetry(mailOptions, 3, fundRequest.id);
  }

  async sendDenialNotification(fundRequest, reason) {
    const template = createBeautifulDenialTemplate(fundRequest, reason);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: fundRequest.requester_email,
      subject: template.subject,
      html: template.html,
    };

    return await this.sendEmailWithRetry(mailOptions, 3, fundRequest.id);
  }
}

// Create and export singleton instance
module.exports = new EmailServiceRenderOptimized();
