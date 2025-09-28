const emailService = require("./utils/emailService");
const db = require("./models/mongoDatabase");

console.log("🔍 APPROVAL TOKEN EMAIL STATUS CHECK");
console.log("=====================================");

(async () => {
  try {
    await db.init();

    const approvalToken = "caeda614-c0e4-4451-899f-af62a2802d51";
    console.log(`🎯 Checking approval token: ${approvalToken}`);

    // Get request by approval token
    const request = await db.getFundRequestByToken(approvalToken);

    if (!request) {
      console.log(`❌ No request found with approval token: ${approvalToken}`);
      process.exit(1);
    }

    console.log(`\n📋 REQUEST DETAILS:`);
    console.log(`==================`);
    console.log(`📌 Request ID: ${request.id}`);
    console.log(`💰 Amount: ${request.amount} ${request.currency}`);
    console.log(`📝 Purpose: ${request.purpose}`);
    console.log(`📊 Status: ${request.status.toUpperCase()}`);
    console.log(`📧 Requester: ${request.requester_email}`);
    console.log(`👨‍💼 Approver: ${request.approver_email}`);
    console.log(`🔗 Approval Token: ${request.approval_token}`);
    console.log(`📅 Created: ${new Date(request.created_at).toLocaleString()}`);

    console.log(`\n🎯 TOKEN USAGE ANALYSIS:`);
    console.log(`========================`);
    if (request.status !== "pending") {
      console.log(`✅ TOKEN WAS USED`);
      console.log(`📊 Final Status: ${request.status.toUpperCase()}`);
      if (request.approved_at) {
        console.log(
          `⏰ Decision Made: ${new Date(request.approved_at).toLocaleString()}`
        );
      }
      if (request.approved_by) {
        console.log(`👤 Decided By: ${request.approved_by}`);
      }
    } else {
      console.log(`⏳ TOKEN NOT YET USED`);
      console.log(`📊 Current Status: PENDING`);
      console.log(`⏰ Awaiting Decision`);
    }

    console.log(`\n📧 EMAIL DELIVERY ANALYSIS:`);
    console.log(`============================`);

    // For pending requests, we expect approval and confirmation emails
    if (request.status === "pending") {
      console.log(`📋 Expected Emails for PENDING Request:`);
      console.log(`   1. 📧 Approval Request → ${request.approver_email}`);
      console.log(`   2. ✅ Confirmation → ${request.requester_email}`);

      console.log(`\n🔍 EMAIL STATUS CHECK:`);

      // Check if we can find any email logs (in real scenario, you'd check email service logs)
      // Since we don't have email logs stored, let's check the system state
      console.log(`📧 Approval Email Status:`);
      console.log(`   Recipient: ${request.approver_email}`);
      console.log(`   Type: New Fund Request Approval Required`);
      console.log(
        `   Should Include: Approval link with token ${approvalToken}`
      );

      // Check if token is still valid (within 7 days)
      const createdAt = new Date(request.created_at);
      const now = new Date();
      const daysDiff = (now - createdAt) / (1000 * 60 * 60 * 24);
      const isValid = daysDiff <= 7;

      console.log(`\n🕐 TOKEN VALIDITY:`);
      console.log(`   Age: ${Math.floor(daysDiff)} days`);
      console.log(`   Status: ${isValid ? "✅ VALID" : "❌ EXPIRED"}`);
      console.log(
        `   Expires: ${
          daysDiff <= 7 ? `In ${Math.ceil(7 - daysDiff)} days` : "Expired"
        }`
      );

      if (isValid) {
        console.log(`\n🎯 RECOMMENDED ACTIONS:`);
        console.log(
          `   1. Check if approver received email at: ${request.approver_email}`
        );
        console.log(
          `   2. Verify approval link works: [FRONTEND_URL]/approve/${approvalToken}`
        );
        console.log(`   3. Contact approver if email not received`);
        console.log(`   4. Use email retry if needed`);
      } else {
        console.log(`\n⚠️  TOKEN EXPIRED:`);
        console.log(`   - Token is no longer valid for approval`);
        console.log(`   - Request may need to be resubmitted`);
        console.log(`   - Contact system administrator`);
      }
    } else {
      console.log(
        `📋 Request has been processed - Status: ${request.status.toUpperCase()}`
      );
      console.log(
        `📧 Status notification should have been sent to: ${request.requester_email}`
      );
    }

    // Test if we can send a test email (only if needed)
    console.log(`\n🧪 EMAIL SERVICE TEST:`);
    console.log(`======================`);
    try {
      const isConnected = await emailService.verifyConnection();
      console.log(
        `📧 Email Service: ${isConnected ? "✅ CONNECTED" : "❌ DISCONNECTED"}`
      );

      if (isConnected && request.status === "pending") {
        console.log(`\n🔄 EMAIL RETRY OPTION AVAILABLE:`);
        console.log(
          `   If approval email was not received, you can retry by running:`
        );
        console.log(
          `   → node -e "const emailService = require('./utils/emailService'); const db = require('./models/mongoDatabase'); (async () => { await db.init(); const request = await db.getFundRequestById('${request.id}'); const approvers = [{email: '${request.approver_email}'}]; await emailService.sendFundRequestNotification(request, approvers); console.log('✅ Approval email resent!'); process.exit(0); })();"`
        );
      }
    } catch (error) {
      console.log(`📧 Email Service: ❌ ERROR - ${error.message}`);
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`===========`);
    console.log(`🎯 Token: ${approvalToken}`);
    console.log(`📌 Request: ${request.id}`);
    console.log(`👤 Approver: ${request.approver_email}`);
    console.log(
      `📊 Status: ${
        request.status === "pending"
          ? "⏳ AWAITING APPROVAL"
          : `✅ ${request.status.toUpperCase()}`
      }`
    );

    // Recalculate daysDiff for summary
    const createdAtSummary = new Date(request.created_at);
    const nowSummary = new Date();
    const daysDiffSummary =
      (nowSummary - createdAtSummary) / (1000 * 60 * 60 * 24);
    console.log(
      `🔗 Token Valid: ${daysDiffSummary <= 7 ? "✅ YES" : "❌ EXPIRED"}`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
