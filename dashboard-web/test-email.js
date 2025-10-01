#!/usr/bin/env node

/**
 * Email Service Test Script
 * Tests SMTP connection and email sending functionality
 */

require("dotenv").config({ path: ".env.production" });
const path = require("path");

async function testEmailService() {
  console.log("🧪 Starting Email Service Test...\n");

  // Check environment variables
  console.log("📧 Environment Variables:");
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || "❌ MISSING"}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || "❌ MISSING"}`);
  console.log(`EMAIL_SECURE: ${process.env.EMAIL_SECURE || "❌ MISSING"}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER || "❌ MISSING"}`);
  console.log(
    `EMAIL_PASS: ${process.env.EMAIL_PASS ? "✅ SET" : "❌ MISSING"}`
  );
  console.log("");

  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    console.error("❌ Missing required email environment variables");
    process.exit(1);
  }

  try {
    // Import and test email service
    const emailService = require("./utils/emailService");

    console.log("🔍 Testing SMTP connection...");
    await emailService.verifyConnection();
    console.log("✅ SMTP connection verified successfully!\n");

    // Test sending a simple email
    console.log("📧 Testing email sending...");
    const testEmailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: "🧪 Email Service Test - " + new Date().toISOString(),
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Email Service Test Successful!</h2>
          <p>This is a test email from the Fund Request Dashboard email service.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${
            process.env.NODE_ENV || "development"
          }</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This email was sent automatically by the email service test script.
          </p>
        </div>
      `,
    };

    const result = await emailService.sendEmailWithRetry(
      testEmailOptions,
      1,
      "TEST"
    );
    console.log(
      `✅ Test email sent successfully! Message ID: ${result.messageId}`
    );
    console.log(`📬 Sent to: ${testEmailOptions.to}`);
  } catch (error) {
    console.error("❌ Email service test failed:", error.message);
    console.error("💡 Troubleshooting tips:");
    console.error("   1. Check your internet connection");
    console.error("   2. Verify Gmail SMTP credentials");
    console.error("   3. Ensure Gmail App Password is correct");
    console.error("   4. Check if Gmail account has 2FA enabled");
    console.error("   5. Verify network allows SMTP connections on port 587");

    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }

    process.exit(1);
  }

  console.log("\n🎉 All email tests passed successfully!");
}

// Run the test
testEmailService();
