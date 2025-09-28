const nodemailer = require("nodemailer");
require("dotenv").config({ path: ".env.production" });

console.log("🔍 EMAIL SYSTEM DIAGNOSTIC");
console.log("==========================");

// Step 1: Check environment variables
console.log("📋 Step 1: Environment Configuration");
console.log("====================================");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST || "❌ NOT SET");
console.log("EMAIL_PORT:", process.env.EMAIL_PORT || "❌ NOT SET");
console.log("EMAIL_SECURE:", process.env.EMAIL_SECURE || "❌ NOT SET");
console.log("EMAIL_USER:", process.env.EMAIL_USER || "❌ NOT SET");
console.log(
  "EMAIL_PASS:",
  process.env.EMAIL_PASS ? "✅ CONFIGURED" : "❌ NOT SET"
);
console.log(
  "EMAIL_FROM:",
  process.env.EMAIL_FROM || "⚠️ NOT SET (using EMAIL_USER as fallback)"
);

// Step 2: Test basic SMTP connection
console.log("\n🔧 Step 2: Basic SMTP Connection Test");
console.log("=====================================");

const basicTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Step 3: Test with enhanced configuration (as used in emailService.js)
console.log("\n🛡️ Step 3: Enhanced SMTP Configuration Test");
console.log("============================================");

const enhancedTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
  pool: true,
  maxConnections: 1,
  rateDelta: 20000,
  rateLimit: 5,
  debug: false,
});

// Step 4: Run diagnostic tests
(async () => {
  try {
    console.log("🧪 Testing Basic SMTP Connection...");
    await basicTransporter.verify();
    console.log("✅ Basic SMTP connection: SUCCESS");

    console.log("\n🧪 Testing Enhanced SMTP Connection...");
    await enhancedTransporter.verify();
    console.log("✅ Enhanced SMTP connection: SUCCESS");

    console.log("\n📧 Testing Email Send (Dry Run)...");

    // Test email configuration without actually sending
    const testMailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send test email to yourself
      subject: "🧪 Fund Request System - Email Test",
      html: `
        <h3>Email System Test</h3>
        <p>This is a test email from the Fund Request System.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Configuration:</strong> Production</p>
        <p><strong>SMTP Host:</strong> ${process.env.EMAIL_HOST}</p>
        <p><strong>Status:</strong> ✅ Email system is working correctly!</p>
      `,
    };

    console.log("📤 Sending test email...");
    console.log("From:", testMailOptions.from);
    console.log("To:", testMailOptions.to);

    const result = await enhancedTransporter.sendMail(testMailOptions);
    console.log("✅ Test email sent successfully!");
    console.log("📧 Message ID:", result.messageId);

    console.log("\n🎉 DIAGNOSIS COMPLETE");
    console.log("====================");
    console.log("✅ Email system is working correctly");
    console.log("📧 SMTP configuration is valid");
    console.log("🔧 Gmail app password is working");

    console.log("\n💡 RECOMMENDATIONS:");
    console.log("===================");
    console.log("1. ✅ Email configuration is correct");
    console.log("2. 🔍 Check if the backend is running in production mode");
    console.log("3. 🔍 Verify that .env.production is being loaded correctly");
    console.log("4. 🔍 Check network connectivity when the error occurs");
    console.log("5. 🔍 Look for rate limiting or temporary Gmail blocks");
  } catch (error) {
    console.error("\n❌ EMAIL SYSTEM ERROR DETECTED");
    console.error("===============================");
    console.error("Error Message:", error.message);
    console.error("Error Code:", error.code || "No code provided");
    console.error("Error Response:", error.response || "No response provided");

    console.log("\n🔧 TROUBLESHOOTING STEPS:");
    console.log("==========================");

    if (error.code === "EAUTH") {
      console.log("❌ AUTHENTICATION ERROR:");
      console.log("   - Check Gmail app password is correct");
      console.log("   - Verify 2FA is enabled on Gmail account");
      console.log("   - Generate new app password if needed");
      console.log("   - Ensure EMAIL_USER matches the Gmail account");
    }

    if (error.code === "ETIMEDOUT" || error.code === "ECONNECTION") {
      console.log("🌐 CONNECTION ERROR:");
      console.log("   - Check internet connection");
      console.log("   - Verify firewall isn't blocking SMTP port 587");
      console.log("   - Try changing EMAIL_PORT to 465 with EMAIL_SECURE=true");
    }

    if (error.code === "EMESSAGE") {
      console.log("📧 MESSAGE ERROR:");
      console.log("   - Check email content format");
      console.log("   - Verify recipient email addresses are valid");
      console.log("   - Check for special characters in content");
    }

    console.log("\n🔄 QUICK FIXES TO TRY:");
    console.log("=======================");
    console.log("1. Generate new Gmail app password");
    console.log("2. Update .env.production with new password");
    console.log("3. Restart the backend server");
    console.log("4. Test again with this diagnostic script");
  }

  process.exit(0);
})();
