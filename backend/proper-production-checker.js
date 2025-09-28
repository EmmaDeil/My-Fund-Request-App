// Use the proper environment-aware database module
const db = require("./proper-env-database");

(async () => {
  try {
    console.log("🔍 PROPER PRODUCTION DATABASE CHECKER");
    console.log("=====================================");

    const requestId = process.argv[2] || "826aa11a-9036-40a3-88f9-bab8a370d6fd";

    console.log(`🔍 Searching for: ${requestId}`);
    console.log("");

    // Connect to the correct database based on environment
    await db.init();

    // Search for the specific request
    console.log("🔎 Searching for request...");
    const request = await db.getFundRequestById(requestId);

    if (request) {
      console.log("✅ FOUND!");
      console.log(`📋 Request: ${request.purpose}`);
      console.log(`💰 Amount: ${request.amount} ${request.currency}`);
      console.log(`📊 Status: ${request.status.toUpperCase()}`);
      console.log(`👤 Requester: ${request.requester_email}`);
      console.log(`👨‍💼 Approver: ${request.approver_email}`);
      console.log(
        `📅 Created: ${new Date(request.created_at).toLocaleString()}`
      );
      console.log(`🔑 Approval Token: ${request.approval_token}`);

      // Now we can use the email-checker functionality
      console.log("\n📧 EMAIL STATUS CHECK:");
      console.log("======================");

      // Check what emails should have been sent based on status
      if (request.status === "pending") {
        console.log("Expected emails for PENDING request:");
        console.log(`✉️  1. Approval Request → ${request.approver_email}`);
        console.log(`✉️  2. Confirmation → ${request.requester_email}`);
      } else if (request.status === "approved") {
        console.log("Expected emails for APPROVED request:");
        console.log(
          `✉️  1. Approval Request → ${request.approver_email} (initial)`
        );
        console.log(
          `✉️  2. Confirmation → ${request.requester_email} (initial)`
        );
        console.log(
          `✉️  3. Approval Notification → ${request.requester_email} (status update)`
        );
      }

      console.log("\n💡 To test email functionality with this request:");
      console.log(
        `   NODE_ENV=${
          process.env.NODE_ENV || "development"
        } node email-checker.js ${requestId}`
      );
    } else {
      console.log("❌ NOT FOUND");

      // Show what's in the database for reference
      console.log("\n📋 Recent requests in current database:");
      const allRequests = await db.getAllFundRequests();
      const recent = allRequests.slice(0, 5);

      if (recent.length > 0) {
        recent.forEach((req, index) => {
          console.log(
            `   ${index + 1}. ${req.id} - ${req.purpose} (${new Date(
              req.created_at
            ).toLocaleDateString()})`
          );
        });

        console.log(`\n💡 Try with one of these valid IDs:`);
        console.log(
          `   NODE_ENV=${
            process.env.NODE_ENV || "development"
          } node proper-production-checker.js ${recent[0].id}`
        );
      } else {
        console.log("   No requests found in current database");
      }
    }

    process.exit(request ? 0 : 1);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
