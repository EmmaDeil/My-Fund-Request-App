const emailService = require("./utils/emailService");
const db = require("./models/mongoDatabase");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

console.log("📧 EMAIL STATUS CHECKER & RETRY TOOL");
console.log("===================================");

(async () => {
  try {
    await db.init();

    // Get request ID from command line or use default
    const requestId = process.argv[2] || "2485bf8d-9414-4b79-8828-e0570bbd588e";
    console.log(`🔍 Checking: ${requestId}`);

    const request = await db.getFundRequestById(requestId);

    if (!request) {
      console.log(`❌ Request not found: ${requestId}`);
      console.log("💡 Usage: node test-email-logging.js [REQUEST_ID]");
      process.exit(1);
    }

    // Display request info
    console.log(
      `\n📋 Request: ${request.purpose} (${request.amount} ${request.currency})`
    );
    console.log(`📊 Status: ${request.status.toUpperCase()}`);
    console.log(`👤 Requester: ${request.requester_email}`);
    console.log(`👨‍💼 Approver: ${request.approver_email}`);

    // Check which emails should exist based on status
    let expectedEmails = [];
    if (request.status === "pending") {
      expectedEmails.push({
        type: "approval",
        recipient: request.approver_email,
        name: "Approval Request",
      });
      expectedEmails.push({
        type: "confirmation",
        recipient: request.requester_email,
        name: "Confirmation",
      });
    } else {
      expectedEmails.push({
        type: "status",
        recipient: request.requester_email,
        name: "Status Notification",
      });
    }

    console.log(`\n📧 Expected Emails (${expectedEmails.length}):`);
    expectedEmails.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.name} → ${email.recipient}`);
    });

    // Ask user about current email status
    let emailStatus = {};
    let missingEmails = [];

    console.log(`\n🔍 EMAIL DELIVERY CHECK:`);
    console.log("======================");

    for (const email of expectedEmails) {
      const sent = await askQuestion(
        `📧 Was "${email.name}" sent to ${email.recipient}? (y/n): `
      );
      emailStatus[email.type] = sent === "y" || sent === "yes";

      if (!emailStatus[email.type]) {
        missingEmails.push(email);
      }

      console.log(
        `   ${email.name}: ${
          emailStatus[email.type] ? "✅ CONFIRMED" : "❌ MISSING"
        }`
      );
    }

    // Summary and retry offer
    const totalEmails = expectedEmails.length;
    const sentEmails = Object.values(emailStatus).filter(Boolean).length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`=========`);
    console.log(`✅ Sent: ${sentEmails}/${totalEmails} emails`);
    console.log(`❌ Missing: ${missingEmails.length}/${totalEmails} emails`);

    if (missingEmails.length > 0) {
      console.log(`\n⚠️  MISSING EMAILS:`);
      missingEmails.forEach((email, i) => {
        console.log(`   ${i + 1}. ${email.name} → ${email.recipient}`);
      });

      const retry = await askQuestion(
        `\n🔄 Retry sending ${missingEmails.length} missing email(s)? (y/n): `
      );

      if (retry === "y" || retry === "yes") {
        console.log(`\n🚀 SENDING MISSING EMAILS...`);
        console.log("==========================");

        for (const email of missingEmails) {
          try {
            console.log(`\n📧 Sending ${email.name}...`);

            if (email.type === "approval") {
              const approvers = [{ email: request.approver_email }];
              await emailService.sendFundRequestNotification(
                request,
                approvers
              );
            } else if (email.type === "confirmation") {
              await emailService.sendConfirmationEmail(request);
            } else if (email.type === "status") {
              await emailService.sendStatusNotification(
                request,
                request.status,
                request.approved_by || "System",
                request.approval_notes || "Status update"
              );
            }

            console.log(`✅ ${email.name} sent successfully!`);
          } catch (error) {
            console.log(`❌ Failed to send ${email.name}: ${error.message}`);
          }
        }

        console.log(`\n🎉 Email retry completed!`);
      } else {
        console.log(`\n⏭️  Skipped retry - emails remain missing.`);
      }
    } else {
      console.log(`\n🎉 ALL EMAILS CONFIRMED DELIVERED!`);
      console.log("   No action needed.");
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    rl.close();
    process.exit(1);
  }
})();
