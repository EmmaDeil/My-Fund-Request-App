const db = require("./models/mongoDatabase");
require("dotenv").config();

(async () => {
  try {
    console.log("🔍 PRODUCTION REQUEST CHECKER");
    console.log("=============================");

    const requestId = process.argv[2] || "826aa11a-9036-40a3-88f9-bab8a370d6fd";

    console.log(`🔍 Searching for request ID: ${requestId}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

    // Connect to current environment database
    await db.init();
    console.log("📊 Database connection established");

    // Try to find the request
    console.log(`\n🔎 Checking current environment database...`);
    const request = await db.getFundRequestById(requestId);

    if (request) {
      console.log(`✅ Found in CURRENT database!`);
      console.log(`📋 Request: ${request.purpose}`);
      console.log(`💰 Amount: ${request.amount} ${request.currency}`);
      console.log(`📊 Status: ${request.status.toUpperCase()}`);
      console.log(`👤 Requester: ${request.requester_email}`);
      console.log(`👨‍💼 Approver: ${request.approver_email}`);
      console.log(
        `📅 Created: ${new Date(request.created_at).toLocaleString()}`
      );
    } else {
      console.log(`❌ NOT FOUND in current environment database`);

      // Check if we can access production database
      console.log(`\n💡 This request might be in the PRODUCTION database.`);
      console.log(
        `   Production requests are stored separately from development.`
      );
      console.log(`\n🔧 To check production database:`);
      console.log(`   1. Set NODE_ENV=production in your environment`);
      console.log(
        `   2. Or run: NODE_ENV=production node production-request-checker.js ${requestId}`
      );
      console.log(`   3. Or access your production database directly`);

      // List recent requests from current database for reference
      console.log(`\n📋 Recent requests in CURRENT database:`);
      const recentRequests = await db.getAllFundRequests();
      const recent = recentRequests.slice(0, 5);

      if (recent.length > 0) {
        recent.forEach((req, index) => {
          console.log(
            `   ${index + 1}. ${req.id} - ${req.purpose} (${new Date(
              req.created_at
            ).toLocaleDateString()})`
          );
        });
      } else {
        console.log(`   No requests found in current database`);
      }
    }

    process.exit(request ? 0 : 1);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
