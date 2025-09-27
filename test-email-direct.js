// Simple email service test
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

// Import the email service directly
const EmailService = require("./backend/utils/emailService");

async function testEmailService() {
  console.log("🧪 Testing Email Service Directly...\n");

  try {
    const emailService = new EmailService();

    // Test 1: Verify email connection
    console.log("1. Testing email connection...");
    const isConnected = await emailService.verifyConnection();
    console.log(
      isConnected
        ? "✅ Email service connected"
        : "❌ Email service connection failed"
    );
    console.log("");

    if (!isConnected) {
      console.log("❌ Cannot proceed with email tests - connection failed");
      return;
    }

    // Test 2: Send a test approval email
    console.log("2. Testing approval request email...");
    const testRequestData = {
      id: "test-request-" + Date.now(),
      requester_name: "John Doe Test",
      requester_email: process.env.EMAIL_USER, // Send to yourself for testing
      department: "IT Testing",
      amount: 500,
      purpose: "Email API Test",
      description: "Testing the email functionality",
      urgency: "Normal",
      approver_email: process.env.EMAIL_USER, // Send to yourself for testing
      approval_token: "test-token-" + Date.now(),
      created_at: new Date().toISOString(),
      _id: "test-request-" + Date.now(),
    };

    const approvalResult = await emailService.sendApprovalEmail(
      testRequestData
    );
    console.log("✅ Approval email sent successfully!");
    console.log("📧 Check your inbox at:", process.env.EMAIL_USER);
    console.log("");

    // Test 3: Send a test confirmation email
    console.log("3. Testing confirmation email...");
    const confirmationResult = await emailService.sendConfirmationEmail(
      testRequestData
    );
    console.log("✅ Confirmation email sent successfully!");
    console.log("📧 Check your inbox again at:", process.env.EMAIL_USER);
    console.log("");

    console.log("🎉 All email tests completed successfully!");
    console.log("📋 Summary:");
    console.log("   - Connection test: ✅ Passed");
    console.log("   - Approval request email: ✅ Sent");
    console.log("   - Confirmation email: ✅ Sent");
    console.log(`   - Test emails sent to: ${process.env.EMAIL_USER}`);
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
    console.log("\n💡 Common issues:");
    console.log("   - Check EMAIL_PASS (app password) in .env file");
    console.log("   - Ensure 2-factor authentication is enabled on Gmail");
    console.log("   - Verify EMAIL_USER is correct in .env file");
  }
}

// Run the test
testEmailService();
