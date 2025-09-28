const db = require("./models/mongoDatabase");

(async () => {
  try {
    console.log("🔍 Connecting to MongoDB...");
    await db.init();

    console.log("📋 Fetching recent fund requests...");
    const requests = await db.getAllFundRequests();

    if (requests.length === 0) {
      console.log("❌ No fund requests found in database");
      process.exit(1);
    }

    console.log(`✅ Found ${requests.length} fund request(s):`);
    console.log("================================================");

    requests.slice(0, 10).forEach((request, index) => {
      console.log(`\n${index + 1}. Request ID: ${request.id}`);
      console.log(`   Purpose: ${request.purpose}`);
      console.log(`   Amount: ${request.amount} ${request.currency}`);
      console.log(`   Status: ${request.status.toUpperCase()}`);
      console.log(
        `   Created: ${new Date(request.created_at).toLocaleString()}`
      );
      console.log(`   Requester: ${request.requester_email}`);
      console.log(`   Approver: ${request.approver_email}`);
    });

    if (requests.length > 10) {
      console.log(`\n... and ${requests.length - 10} more requests`);
    }

    console.log(`\n💡 To test email logging with a valid request ID, use:`);
    console.log(`   node email-checker.js ${requests[0].id}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
